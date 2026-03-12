import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { RedisService } from '../../libs/infrustructure/redis/redis.service';
import { UserRepository } from '../users/repositorys/user.repository';
import { ToyRto } from './rto/toy.rto';
import { GetChanceResponseRto } from './rto/get-chance-response.rto';
import { StartGameResponseRto } from './rto/start-game-response.rto';
import { buildUserToysRto } from './helpers/build-user-toys-rto.helper';
import { buildPoolGiftsRto } from './helpers/build-pool-gifts-rto.helper';
import { computeAverageWinning } from './helpers/compute-average-winning.helper';
import { computeChanceFromMultiplier } from './helpers/compute-chance-from-multiplier.helper';
import { getMinPriceTon } from './helpers/get-min-price-ton.helper';
import { priceToTon } from './helpers/price-to-ton.helper';
import { toNftBuyerGift, type NftBuyerGift } from './types/nft-buyer-gift.type';
import type { UpgrateState } from './types/upgrate-state.type';

const UPGRATE_TTL_SECONDS = 10 * 60; // 10 минут
const MIN_PRICE_REDIS_KEY = 'gifts:min_price_ton';
const MIN_PRICE_TTL_SECONDS = 5 * 60;
const MIN_PRICE_PROBE_STEP = 0.5;
const MAX_ITERATIONS = 10;
const POOL_SIZE = 10;
const UPGRATE_STATE_REDIS_KEY_PREFIX = 'upgrate:state';

@Injectable()
export class UpgrateService {
  private readonly logger = new Logger(UpgrateService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly nftBuyerUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly userRepository: UserRepository,
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
    const { winGifts, loseGifts, baseAmount } = await this.fetchWinLosePools(
      sumPrices,
      multiplier,
      minPriceTon,
    );

    const chance = computeChanceFromMultiplier(multiplier);
    await this.saveUpgrateStateToRedis(
      userId,
      winGifts,
      chance,
      baseAmount,
      loseGifts,
    );

    const winning = computeAverageWinning(winGifts);
    const userToys = buildUserToysRto(userGifts, chance, baseAmount, winning);
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

  private async fetchWinLosePools(
    sumPrices: number,
    multiplier: number,
    minPriceTon: number,
  ): Promise<{
    winGifts: NftBuyerGift[];
    loseGifts: NftBuyerGift[];
    baseAmount: number;
  }> {
    let baseAmount = sumPrices * multiplier;
    let winGifts: NftBuyerGift[] = [];
    let loseGifts: NftBuyerGift[] = [];

    const ensurePoolSize = (
      pool: NftBuyerGift[],
      fallback: NftBuyerGift[],
    ): NftBuyerGift[] => {
      if (pool.length >= POOL_SIZE) return pool.slice(0, POOL_SIZE);
      const result = [...pool];

      const seen = new Set<string>();
      for (const g of result) {
        const key = String(
          g?.id ?? `${g?.name ?? ''}|${g?.image ?? ''}|${g?.price ?? ''}`,
        );
        seen.add(key);
      }

      for (const g of fallback) {
        if (result.length >= POOL_SIZE) break;
        const key = String(
          g?.id ?? `${g?.name ?? ''}|${g?.image ?? ''}|${g?.price ?? ''}`,
        );
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(g);
      }
      return result.slice(0, POOL_SIZE);
    };

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      if (baseAmount < minPriceTon) {
        baseAmount = minPriceTon;
      }
      const amountHigh = Math.max(minPriceTon, baseAmount * 1.3);
      const amountLow = Math.max(minPriceTon, baseAmount * 0.7);

      try {
        const [giftsHigh, giftsLow] = await Promise.all([
          this.fetchGiftsByPrice(amountHigh),
          this.fetchGiftsByPrice(amountLow),
        ]);
        winGifts = (giftsHigh ?? []).slice(0, POOL_SIZE);
        loseGifts = (giftsLow ?? []).slice(0, POOL_SIZE);

        if (winGifts.length >= POOL_SIZE && loseGifts.length >= POOL_SIZE) {
          break;
        }
      } catch (err) {
        this.logger.warn(
          `getChance by-price failed at baseAmount=${baseAmount}: ${(err as Error).message}`,
        );
      }
      baseAmount = baseAmount / 2;
    }

    // Финальный фолбек: пробуем добить пулы самым "широким" запросом (minPriceTon)
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

    return { winGifts, loseGifts, baseAmount };
  }

  private async saveUpgrateStateToRedis(
    userId: string,
    winGifts: NftBuyerGift[],
    chance: number,
    bet: number,
    loseGifts: NftBuyerGift[],
  ): Promise<void> {
    const key = `${UPGRATE_STATE_REDIS_KEY_PREFIX}:${userId}`;
    const state: UpgrateState = { winGifts, chance, bet, loseGifts };
    await this.redisService.set(
      key,
      JSON.stringify(state),
      UPGRATE_TTL_SECONDS,
    );
    this.logger.debug(
      `Saved upgrate state for user ${userId}: win=${winGifts.length}, lose=${loseGifts.length}, chance=${chance}, bet=${bet}`,
    );
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

    const state: UpgrateState = { winGifts, chance, bet, loseGifts };

    const didWin = Math.random() < state.chance;

    if (!didWin) {
      return { result: 'lose', gifts: [] };
    }

    const selected = this.selectWinningGifts(state);

    let gifts: ToyRto[] = selected.map((g, idx) => ({
      id: g.id ?? String(idx),
      name: g.name,
      image: g.image,
    }));

    if (gifts.length > 0) {
      // Создаём подарки в инвентаре пользователя
      const created = await Promise.all(
        gifts.map((g) =>
          this.userRepository.createUserGift({
            userId,
            giftName: g.name ?? 'Gift',
            giftAddress: '', // нет адреса из NFT-buyer, оставляем пустым
            image: g.image,
            price: undefined,
            lottieUrl: undefined,
          }),
        ),
      );

      // Возвращаем фактические id созданных userGifts
      gifts = created.map((u) => ({
        id: u.id,
        name: u.giftName,
        image: u.image ?? undefined,
      }));
    }

    return { result: 'win', gifts };
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
