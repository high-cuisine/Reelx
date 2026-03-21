import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { RedisService } from '../../libs/infrustructure/redis/redis.service';
import { UserRepository } from '../users/repositorys/user.repository';
import { UsersService } from '../users/services/users.service';
import { ToyRto } from './rto/toy.rto';
import { GetChanceResponseRto } from './rto/get-chance-response.rto';
import { StartGameResponseRto } from './rto/start-game-response.rto';
import { buildUserToysRto } from './helpers/build-user-toys-rto.helper';
import { buildPoolGiftsRto } from './helpers/build-pool-gifts-rto.helper';
import { computeAverageWinning } from './helpers/compute-average-winning.helper';
import { getMinPriceTon } from './helpers/get-min-price-ton.helper';
import { priceToTon } from './helpers/price-to-ton.helper';
import { toNftBuyerGift, type NftBuyerGift } from './types/nft-buyer-gift.type';
import type { UpgrateState } from './types/upgrate-state.type';
import { AdminSettingsRepository } from '../admin/repositorys/admin-settings.repository';

const UPGRATE_TTL_SECONDS = 10 * 60; // 10 минут
const MIN_PRICE_REDIS_KEY = 'gifts:min_price_ton';
const MIN_PRICE_TTL_SECONDS = 5 * 60;
const MIN_PRICE_PROBE_STEP = 0.5;
const MAX_ITERATIONS = 10;
const POOL_SIZE = 10;
const UPGRATE_STATE_REDIS_KEY_PREFIX = 'upgrate:state';
const NFT_PURCHASE_FEE_NANO = 300_000_000n; // ~0.3 TON

@Injectable()
export class UpgrateService {
  private readonly logger = new Logger(UpgrateService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly nftBuyerUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly userRepository: UserRepository,
    private readonly usersService: UsersService,
    private readonly settingsRepository: AdminSettingsRepository,
  ) {
    this.nftBuyerUrl = this.configService.get<string>(
      'NFT_BUYER_URL',
      'http://localhost:3001',
    );
    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async getChance(
    userId: string,
    toyIds: string[],
    multiplier: number,
  ): Promise<GetChanceResponseRto> {
    const { userGifts, sumPrices } = await this.getAndValidateUserGifts(
      userId,
      toyIds,
    );

    const minPriceTon = await getMinPriceTon({
      redisService: this.redisService,
      axiosInstance: this.axiosInstance,
      logger: this.logger,
      nftBuyerUrl: this.nftBuyerUrl,
      redisKey: MIN_PRICE_REDIS_KEY,
      ttlSeconds: MIN_PRICE_TTL_SECONDS,
      probeStep: MIN_PRICE_PROBE_STEP,
      maxAmountTon: 100,
      fallbackTon: 1,
    });
    const { winGifts, loseGifts } = await this.fetchWinLosePools(
      sumPrices,
      multiplier,
      minPriceTon,
    );

    /** Шанс зависит только от мультипликатора (не от уменьшенного baseAmount при подборе пула). */
    const chance = Math.min(
      0.99,
      Math.max(0.01, Number((multiplier / 100).toFixed(4))),
    );
    /** Реальная ставка — сумма выбранных подарков; не меняется при смене множителя и откате цены пула. */
    const betTon = sumPrices;
    await this.saveUpgrateStateToRedis(
      userId,
      toyIds,
      winGifts,
      chance,
      betTon,
      loseGifts,
      [],
    );

    const winning = computeAverageWinning(winGifts);
    const userToys = buildUserToysRto(userGifts, chance, betTon, winning);
    const poolGifts = buildPoolGiftsRto(winGifts, loseGifts);

    return { userToys, poolGifts };
  }

  private async getAndValidateUserGifts(
    userId: string,
    toyIds: string[],
  ): Promise<{
    userGifts: Awaited<ReturnType<UserRepository['getUserGiftsByIds']>>;
    sumPrices: number;
  }> {
    const userGifts = await this.userRepository.getUserGiftsByIds(
      userId,
      toyIds,
    );
    if (userGifts.length === 0) {
      throw new BadRequestException(
        'No gifts found for the given toyIds or they are already used',
      );
    }
    const sumPrices = userGifts.reduce(
      (sum, g) => sum + (g.price ?? 0),
      0,
    ) as number;
    return { userGifts, sumPrices };
  }

  private nftGiftDedupeKey(g: NftBuyerGift): string {
    return String(
      g?.id ?? `${g?.name ?? ''}|${g?.image ?? ''}|${g?.price ?? ''}`,
    );
  }

  /** Добавляет в пул новые подарки без дублей, не затирая уже собранные (важно для x20 и т.п.). */
  private mergePoolUnique(
    existing: NftBuyerGift[],
    incoming: NftBuyerGift[] | undefined,
    maxSize: number,
  ): NftBuyerGift[] {
    const seen = new Set<string>();
    const result: NftBuyerGift[] = [];
    const push = (g: NftBuyerGift) => {
      if (result.length >= maxSize) return;
      const key = this.nftGiftDedupeKey(g);
      if (seen.has(key)) return;
      seen.add(key);
      result.push(g);
    };
    for (const g of existing) push(g);
    for (const g of incoming ?? []) push(g);
    return result;
  }

  private async fetchWinLosePools(
    sumPrices: number,
    multiplier: number,
    minPriceTon: number,
  ): Promise<{
    winGifts: NftBuyerGift[];
    loseGifts: NftBuyerGift[];
  }> {
    // Целевая цена выигрыша ≈ ставка * мультипликатор
    const targetTon = sumPrices * multiplier;
    let winGifts: NftBuyerGift[] = [];
    let loseGifts: NftBuyerGift[] = [];

    const ensurePoolSize = (
      pool: NftBuyerGift[],
      fallback: NftBuyerGift[],
    ): NftBuyerGift[] => {
      return this.mergePoolUnique(pool, fallback, POOL_SIZE);
    };

    const mergeFromTier = async (baseAmount: number): Promise<void> => {
      const b = Math.max(minPriceTon, baseAmount);
      const amountHigh = Math.max(minPriceTon, b * 1.3);
      const amountLow = Math.max(minPriceTon, b * 0.7);
      const amountMid = b;
      try {
        const [giftsHigh, giftsLow, giftsMid] = await Promise.all([
          this.fetchGiftsByPrice(amountHigh),
          this.fetchGiftsByPrice(amountLow),
          this.fetchGiftsByPrice(amountMid),
        ]);
        winGifts = this.mergePoolUnique(winGifts, giftsHigh ?? [], POOL_SIZE);
        winGifts = this.mergePoolUnique(winGifts, giftsMid ?? [], POOL_SIZE);
        loseGifts = this.mergePoolUnique(loseGifts, giftsLow ?? [], POOL_SIZE);
      } catch (err) {
        this.logger.warn(
          `getChance by-price failed at baseAmount=${b}: ${(err as Error).message}`,
        );
      }
    };

    // Сначала полный таргет (35 * 20 = 700 и т.д.) — не теряем дорогие слоты при доборе
    await mergeFromTier(targetTon);

    let fillBase = targetTon;
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      if (winGifts.length >= POOL_SIZE && loseGifts.length >= POOL_SIZE) {
        break;
      }
      fillBase = Math.max(minPriceTon, fillBase / 2);
      await mergeFromTier(fillBase);
    }

    // Финальный фолбек: добить пулы с пола цен, не удаляя уже найденные
    if (winGifts.length < POOL_SIZE || loseGifts.length < POOL_SIZE) {
      try {
        const fallback = await this.fetchGiftsByPrice(minPriceTon);
        winGifts = ensurePoolSize(winGifts, fallback);
        loseGifts = ensurePoolSize(loseGifts, fallback);
      } catch (err) {
        this.logger.warn(
          `Upgrate fallback fetch at minPriceTon=${minPriceTon} failed: ${(err as Error).message}`,
        );
      }
    }

    if (winGifts.length < POOL_SIZE || loseGifts.length < POOL_SIZE) {
      this.logger.warn(
        `Upgrate pools incomplete after fallback: win=${winGifts.length}, lose=${loseGifts.length}`,
      );
    }

    const byPriceDesc = (a: NftBuyerGift, b: NftBuyerGift) =>
      priceToTon(b.price) - priceToTon(a.price);
    const byPriceAsc = (a: NftBuyerGift, b: NftBuyerGift) =>
      priceToTon(a.price) - priceToTon(b.price);
    winGifts.sort(byPriceDesc);
    loseGifts.sort(byPriceAsc);

    return { winGifts, loseGifts };
  }

  private parseWishNftsFromState(obj: Record<string, unknown>): string[] {
    if (Array.isArray(obj.wishNfts)) {
      return (obj.wishNfts as unknown[]).filter(
        (v): v is string => typeof v === 'string',
      );
    }
    if (typeof obj.wishNft === 'string' && obj.wishNft.length > 0) {
      return [obj.wishNft];
    }
    return [];
  }

  private async saveUpgrateStateToRedis(
    userId: string,
    toyIds: string[],
    winGifts: NftBuyerGift[],
    chance: number,
    bet: number,
    loseGifts: NftBuyerGift[],
    wishNfts: string[] = [],
  ): Promise<void> {
    const key = `${UPGRATE_STATE_REDIS_KEY_PREFIX}:${userId}`;
    const state: UpgrateState = { toyIds, winGifts, chance, bet, loseGifts, wishNfts };
    await this.redisService.set(
      key,
      JSON.stringify(state),
      UPGRATE_TTL_SECONDS,
    );
    this.logger.debug(
      `Saved upgrate state for user ${userId}: toyIds=${toyIds.length}, win=${winGifts.length}, lose=${loseGifts.length}, chance=${chance}, bet=${bet}`,
    );
  }

  async setWishNfts(
    userId: string,
    nftNames: string[],
  ): Promise<{ success: true; chance: number }> {
    const key = `${UPGRATE_STATE_REDIS_KEY_PREFIX}:${userId}`;
    const raw = await this.redisService.get(key);
    if (!raw) {
      throw new BadRequestException(
        'Upgrate state not found. Call get-chance first.',
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new BadRequestException('Upgrate state is corrupted.');
    }

    if (parsed == null || typeof parsed !== 'object') {
      throw new BadRequestException('Upgrate state is corrupted.');
    }

    const obj = parsed as Record<string, unknown>;
    const winRaw = obj.winGifts;
    if (!Array.isArray(winRaw)) {
      throw new BadRequestException('Upgrate state is corrupted.');
    }

    const winGifts: NftBuyerGift[] = [];
    for (const item of winRaw) {
      const g = toNftBuyerGift(item);
      if (g) winGifts.push(g);
    }

    const uniqueNames = [...new Set(nftNames.map((n) => n.trim()).filter(Boolean))];
    if (uniqueNames.length === 0) {
      throw new BadRequestException('At least one wish name is required');
    }

    const wishGifts: NftBuyerGift[] = [];
    for (const name of uniqueNames) {
      const wishGift = winGifts.find((g) => g.name === name);
      if (!wishGift) {
        throw new BadRequestException(
          `NFT not found in current win pool: ${name}`,
        );
      }
      wishGifts.push(wishGift);
    }

    const toyIds = Array.isArray(obj.toyIds)
      ? (obj.toyIds as unknown[]).filter((v): v is string => typeof v === 'string')
      : [];
    const bet = typeof obj.bet === 'number' ? obj.bet : 0;
    const loseRaw = obj.loseGifts;
    const loseGifts: NftBuyerGift[] = Array.isArray(loseRaw)
      ? (loseRaw as unknown[]).reduce<NftBuyerGift[]>((acc, item) => {
          const g = toNftBuyerGift(item);
          if (g) acc.push(g);
          return acc;
        }, [])
      : [];

    const sumWishPriceTon = wishGifts.reduce(
      (sum, g) => sum + priceToTon(g.price),
      0,
    );
    const { upgradeRTP } = await this.settingsRepository.getSettings();
    const rtpFactor = Number(upgradeRTP) / 100;
    const chanceRaw =
      sumWishPriceTon > 0 ? (bet / sumWishPriceTon) * rtpFactor : 0;
    const chance = Math.min(0.99, Math.max(0.01, chanceRaw));

    await this.saveUpgrateStateToRedis(
      userId,
      toyIds,
      winGifts,
      chance,
      bet,
      loseGifts,
      uniqueNames,
    );
    return { success: true, chance };
  }

  async startGame(userId: string): Promise<StartGameResponseRto> {
    const key = `${UPGRATE_STATE_REDIS_KEY_PREFIX}:${userId}`;
    const raw = await this.redisService.get(key);
    if (!raw) {
      throw new BadRequestException('Upgrate state not found. Call get-chance first.');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new BadRequestException('Upgrate state is corrupted.');
    }

    if (parsed == null || typeof parsed !== 'object') {
      throw new BadRequestException('Upgrate state is corrupted.');
    }

    const obj = parsed as Record<string, unknown>;
    const toyIds = Array.isArray(obj.toyIds)
      ? (obj.toyIds as unknown[]).filter((v): v is string => typeof v === 'string')
      : [];
    const chance = typeof obj.chance === 'number' ? obj.chance : NaN;
    const bet = typeof obj.bet === 'number' ? obj.bet : NaN;
    const winRaw = obj.winGifts;
    const loseRaw = obj.loseGifts;

    if (!Number.isFinite(chance) || !Number.isFinite(bet)) {
      throw new BadRequestException('Upgrate state is corrupted.');
    }
    if (!Array.isArray(winRaw) || !Array.isArray(loseRaw)) {
      throw new BadRequestException('Upgrate state is corrupted.');
    }

    const winGifts: NftBuyerGift[] = [];
    for (const item of winRaw) {
      const g = toNftBuyerGift(item);
      if (g) winGifts.push(g);
    }
    const loseGifts: NftBuyerGift[] = [];
    for (const item of loseRaw) {
      const g = toNftBuyerGift(item);
      if (g) loseGifts.push(g);
    }

    const wishNfts = this.parseWishNftsFromState(obj);

    const state: UpgrateState = { toyIds, winGifts, chance, bet, loseGifts, wishNfts };

    const didWin = Math.random() < state.chance;

    if (!didWin) {
      if (state.toyIds.length > 0) {
        await this.userRepository.markUserGiftsAsOut(userId, state.toyIds);
        this.logger.debug(
          `Upgrate LOSE: marked ${state.toyIds.length} gifts as out for user ${userId}`,
        );
      }
      await this.redisService.del(key);
      return { result: 'lose', gifts: [] };
    }

    // При выигрыше тоже забираем поставленные подарки
    if (state.toyIds.length > 0) {
      await this.userRepository.markUserGiftsAsOut(userId, state.toyIds);
      this.logger.debug(
        `Upgrate WIN: marked ${state.toyIds.length} bet gifts as out for user ${userId}`,
      );
    }

    let selected: NftBuyerGift[];
    if (state.wishNfts.length > 0) {
      const wished: NftBuyerGift[] = [];
      for (const name of state.wishNfts) {
        const g = state.winGifts.find((x) => x.name === name);
        if (g) wished.push(g);
      }
      selected =
        wished.length > 0 ? wished : this.selectWinningGifts(state);
    } else {
      selected = this.selectWinningGifts(state);
    }

    if (selected.length === 0) {
      await this.redisService.del(key);
      return { result: 'win', gifts: [] };
    }

    const created = await Promise.all(
      selected.map((g) => this.createUserGiftFromWin(userId, g)),
    );

    const gifts: ToyRto[] = created.map((u, i) => ({
      id: u.id,
      name: u.giftName,
      image: u.image ?? undefined,
      price: selected[i] ? priceToTon(selected[i].price) : undefined,
    }));

    await this.redisService.del(key);
    return { result: 'win', gifts };
  }

  /**
   * Как в gifts: purchase через NFT buyer (если есть address), запрос lottie, создание записи через UsersService.
   */
  private async createUserGiftFromWin(
    userId: string,
    g: NftBuyerGift,
  ): Promise<{ id: string; giftName: string; image: string | null }> {
    const saleAddress = g.ownerAddress ?? g.address;
    const priceTon = priceToTon(g.price);

    if (saleAddress && typeof priceTon === 'number' && priceTon > 0) {
      try {
        const priceNano = BigInt(Math.round(priceTon * 1_000_000_000));
        const totalNano = (priceNano + NFT_PURCHASE_FEE_NANO).toString();
        await this.axiosInstance.post(
          `${this.nftBuyerUrl}/api/nft/purchase`,
          { sale_address: saleAddress, price: totalNano },
        );
        this.logger.debug(
          `Upgrate: NFT purchase requested for user ${userId}, sale_address=${saleAddress}`,
        );
      } catch (err) {
        this.logger.warn(
          `Upgrate: NFT purchase failed for user ${userId}: ${(err as Error).message}`,
        );
      }
    }

    let lottieUrl: string | undefined = g.lottie;
    if (!lottieUrl && g.address) {
      try {
        const nftDetailUrl = `${this.nftBuyerUrl}/api/nft/${encodeURIComponent(g.address)}`;
        const nftRes = await this.axiosInstance.get(nftDetailUrl);
        lottieUrl =
          nftRes.data?.media?.lottie ?? nftRes.data?.metadata?.lottie ?? '';
      } catch (e) {
        this.logger.debug(
          `Upgrate: could not fetch lottie for ${g.address}: ${(e as Error).message}`,
        );
      }
    }

    const createdGift = await this.usersService.createUserGift({
      userId,
      giftName: g.name ?? 'Gift',
      giftAddress: g.address ?? '',
      collectionAddress: g.collection?.address,
      image: g.image,
      price: priceTon,
      lottieUrl: lottieUrl || undefined,
    });

    return {
      id: createdGift.id,
      giftName: createdGift.giftName,
      image: createdGift.image,
    };
  }

  private selectWinningGifts(state: UpgrateState): NftBuyerGift[] {
    // Минимум подарков, чтобы суммарная цена была > bet
    const sorted = [...state.winGifts].sort(
      (a, b) => priceToTon(a.price) - priceToTon(b.price),
    );
    const picked: NftBuyerGift[] = [];
    let sum = 0;
    for (const g of sorted) {
      if (picked.length === 0 || sum <= state.bet) {
        picked.push(g);
        sum += priceToTon(g.price);
      }
      if (sum > state.bet) break;
    }
    return picked.length > 0 ? picked : sorted.slice(0, 1);
  }

  private async fetchGiftsByPrice(amountTon: number): Promise<NftBuyerGift[]> {
    const url = `${this.nftBuyerUrl}/api/nft/gifts/by-price`;
    const response = await this.axiosInstance.post(url, {
      amount: amountTon,
    });
    const giftsRaw: unknown = response.data?.gifts;
    if (!Array.isArray(giftsRaw)) return [];
    const gifts: NftBuyerGift[] = [];
    for (const item of giftsRaw) {
      const gift = toNftBuyerGift(item);
      if (gift) gifts.push(gift);
    }
    return gifts;
  }
}
