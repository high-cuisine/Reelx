import { BadRequestException, Injectable, Logger, HttpException, HttpStatus, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { getCountGifts } from './helpers/getCountGifts.helper';
import { getMoneyPrices } from './helpers/getMoneyPrices.helper';
import { formatGiftItem, formatMoneyItem } from './helpers/formatGiftItem.helper';
import { convertAmountToTon } from './helpers/convertAmountToTon.helper';
import { RedisService } from '../../libs/infrustructure/redis/redis.service';
import { formatWheelItem } from './helpers/formatWheelItem.helper';
import {
  WheelItem,
  WheelGiftItem,
  WheelMoneyItem,
  WheelSecretItem,
  WheelTelegramGiftItem,
} from './interfaces/wheel-item.interface';
import { formatMinimalPrize } from './helpers/formatMinimalPrize.helper';
import { StartGameResponseDto } from './dto/start-game-response.dto';
import { UsersService } from '../users/services/users.service';
import { UserGamesType, GameCurrancy } from '@prisma/client';
import { CurrancyService } from '../../libs/common/modules/Currancy/services/Currancy.service';
import { GiftsRepository } from './repositorys/gifts.repository';
import { WinsService } from '../wins/wins.service';
import { TelegramStarGiftsService } from './services/telegram-star-gifts.service';
import {
  SOLO_WHEEL_TOTAL_SLOTS,
  matchTelegramOnlyStakeTier,
  getTelegramOnlyTierConfig,
  isNftSoloStake,
  MIN_PRODUCT_STAKE_TON,
  MIN_PRODUCT_STAKE_STARS,
} from './constants/stake-tiers.config';

@Injectable()
export class GiftsService {
  private readonly logger = new Logger(GiftsService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly nftBuyerUrl: string;
  private readonly WHEEL_TTL_SECONDS = 10 * 60; // 10 минут
  private readonly MIN_PRICE_REDIS_KEY = 'gifts:min_price_ton';
  private readonly MIN_PRICE_TTL_SECONDS = 5 * 60; // 5 минут
  /** Ниже этого эквивалента в TON только NFT (+ Telegram solo); выше — подмешиваются сектора валюты. Env: GIFTS_MONEY_MIX_MIN_TON */
  private readonly moneyMixMinTon: number;
  /** Шаг пробы мин. цены NFT (меньше — ниже возможный минимум на маркете). Env: GIFTS_MIN_PRICE_PROBE_STEP */
  private readonly minPriceProbeStep: number;
  /** Задержка перед sendGift в Telegram (мс); ответ игры не ждёт — только фактическая отправка. Env: TELEGRAM_GIFT_SEND_DELAY_MS */
  private readonly telegramGiftSendDelayMs: number;

  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
    private usersService: UsersService,
    private giftsRepository: GiftsRepository,
    private currancyService: CurrancyService,
    private winsService: WinsService,
    private telegramStarGiftsService: TelegramStarGiftsService,
  ) {
    this.nftBuyerUrl = this.configService.get<string>('NFT_BUYER_URL', 'http://localhost:3001');
    
    if (!this.nftBuyerUrl) {
      this.logger.warn('NFT_BUYER_URL not found in environment variables');
    }

    const stepRaw = this.configService.get<string>('GIFTS_MIN_PRICE_PROBE_STEP', '0.2');
    const stepParsed = parseFloat(stepRaw);
    this.minPriceProbeStep =
      Number.isFinite(stepParsed) && stepParsed > 0 ? stepParsed : 0.2;

    const mixRaw = this.configService.get<string>('GIFTS_MONEY_MIX_MIN_TON', '20');
    const mixParsed = parseFloat(mixRaw);
    this.moneyMixMinTon =
      Number.isFinite(mixParsed) && mixParsed > 0 ? mixParsed : 20;

    const delayRaw = this.configService.get<string>('TELEGRAM_GIFT_SEND_DELAY_MS', '5000');
    const delayParsed = parseInt(delayRaw, 10);
    this.telegramGiftSendDelayMs =
      Number.isFinite(delayParsed) && delayParsed >= 0 ? delayParsed : 5000;

    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async getGiftsByPrice(
    body?: { amount?: number; type?: 'ton' | 'stars' },
    userId?: string,
  ): Promise<any> {
    try {
      const amount = Number(body?.amount || 0);
      const currencyType = body?.type; // 'ton' | 'stars' из запроса

      const telegramOnlyTier = getTelegramOnlyTierConfig(
        amount,
        currencyType as 'ton' | 'stars' | undefined,
      );
      const telegramOnlySlots = telegramOnlyTier?.telegramSlots ?? null;

      let originalData: any[] = [];
      let result: any[];

      if (telegramOnlyTier !== null) {
        result = await this.buildTelegramOnlyWheel(
          telegramOnlyTier.telegramSlots,
          telegramOnlyTier.maxGiftStars,
          (data) => { originalData = data; },
        );
      } else {
        const tonAmount = await this.getTonAmount(amount, currencyType as 'ton' | 'stars');

        console.log('tonAmount', tonAmount);

        result = await this.getGiftsPrices(tonAmount, 'ton', (data) => {
          originalData = data;
        });

        if (
          tonAmount > this.moneyMixMinTon &&
          Array.isArray(result) &&
          result.length > 0
        ) {
          result = await this.mergeMoneyIntoGiftWheel(result, tonAmount);
        }

        this.logger.debug(
          `Wheel for amount ${amount} ${currencyType || 'ton'} (ton≈${tonAmount}), moneyMix=${tonAmount > this.moneyMixMinTon}`,
        );
      }

      if (telegramOnlySlots !== null) {
        this.logger.debug(
          `Wheel for amount ${amount} ${currencyType || 'ton'} (telegram-only, ${telegramOnlySlots} TG slots)`,
        );
      }

      // Сохраняем барабан в Redis, если есть userId
      if (userId && result && Array.isArray(result)) {
        await this.saveWheelToRedis(userId, result, originalData, amount, currencyType || 'ton');
      }

      return result;
    } catch (error) {
      this.logger.error(`Error proxying request to NFT buyer: ${error.message}`);
      
      if (error.response) {
        throw new HttpException(
          error.response.data || 'Error from NFT buyer service',
          error.response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      
      throw new HttpException(
        'Failed to connect to NFT buyer service',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private async buildTelegramOnlyWheel(
    telegramSlotCount: number,
    maxGiftStars: number,
    onOriginalData?: (data: any[]) => void,
  ): Promise<any[]> {
    if (onOriginalData) {
      onOriginalData([]);
    }

    const telegramSlices =
      await this.telegramStarGiftsService.buildWheelSlices(maxGiftStars, telegramSlotCount);

    const slots: any[] = [];

    for (const slice of telegramSlices) {
      slots.push({
        type: 'telegram-gift',
        telegramGiftId: slice.telegramGiftId,
        starCount: slice.starCount,
        name: slice.name,
        image: slice.image ?? '',
        price: slice.starCount,
      });
    }

    while (slots.length < SOLO_WHEEL_TOTAL_SLOTS) {
      slots.push({
        type: 'no-loot',
        price: 0,
        image: '',
        name: 'No loot',
      });
    }

    return slots;
  }

  private async getGiftsPrices(
    amount: number,
    currencyType?: 'ton' | 'stars',
    onOriginalData?: (data: any[]) => void,
  ) {
    const url = `${this.nftBuyerUrl}/api/nft/gifts/by-price`;
    const inputCurrency = currencyType === 'stars' ? 'stars' : 'ton';
    let amountTon = convertAmountToTon(amount, inputCurrency);

    const minPriceTon = await this.getMinPriceTon();
    amountTon = Math.max(amountTon, minPriceTon);

    this.logger.debug(
      `Proxying request to ${url} with body: ${JSON.stringify({ amount: amountTon })} (from ${amount} ${inputCurrency}, min ${minPriceTon})`,
    );

    const response = await this.axiosInstance.post(url, { amount: amountTon });

    const allRawGifts: any[] = response.data.gifts || [];

    let originalGifts: any[] = [];

    // Правила формирования слотов:
    // 1) 0.2 / 0.5 / 1 TON: только Telegram-подарки + no-loot
    // 2) 2 <= amount <= 5: solo — до 7 NFT (при 5 TON — до 6) + Telegram из доли no-loot + no-loot
    // 3) 10 <= amount < 20: 9 слотов подарков без no-loot
    // 4) остальное — старая логика (getCountGifts)

    if (isNftSoloStake(amount)) {
      const totalSlots = SOLO_WHEEL_TOTAL_SLOTS;
      const isFiveTonStake =
        amountTon >= 5 - Number.EPSILON && amountTon <= 5 + Number.EPSILON;

      const nanoPrice = (g: any) => {
        const p = g?.price;
        if (p == null) return Number.POSITIVE_INFINITY;
        const n = typeof p === 'string' ? Number(p) : Number(p);
        return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
      };
      const sortedRaw = [...allRawGifts].sort((a, b) => nanoPrice(a) - nanoPrice(b));

      const slots: any[] = [];

      const maxGifts = Math.min(isFiveTonStake ? 6 : 7, sortedRaw.length);
      originalGifts = sortedRaw.slice(0, maxGifts);

      if (onOriginalData) {
        onOriginalData(originalGifts);
      }

      const formattedGifts = originalGifts.map((g: any) =>
        formatGiftItem(g, 'gift'),
      );

      // Для ставки выше минимума в solo — прежняя логика no-loot / Telegram из доли пустых слотов
      const noLootShare = 0.5;
      const initialNoLootSlots = Math.round(totalSlots * noLootShare);
      const telegramSlices = await this.telegramStarGiftsService.buildCheapestWheelSlices(
        Math.min(initialNoLootSlots, 6),
      );
      const telegramSlotsCount = telegramSlices.length;
      const noLootSlotsCount = Math.max(0, initialNoLootSlots - telegramSlotsCount);
      const giftSlotsToDistribute = Math.max(0, totalSlots - initialNoLootSlots);

      // Если подарков нет — весь барабан no-loot
      if (formattedGifts.length === 0) {
        for (let i = 0; i < totalSlots; i++) {
          slots.push({
            type: 'no-loot',
            price: 0,
            image: '',
            name: 'No loot',
          });
        }
        return slots;
      }

      const baseSlotsPerGift = Math.floor(giftSlotsToDistribute / formattedGifts.length);
      let extraSlots = giftSlotsToDistribute % formattedGifts.length;

      formattedGifts.forEach((gift) => {
        let slotsForThisGift = baseSlotsPerGift;
        if (extraSlots > 0) {
          slotsForThisGift += 1;
          extraSlots -= 1;
        }

        for (let i = 0; i < slotsForThisGift; i++) {
          slots.push(gift);
        }
      });

      for (const slice of telegramSlices) {
        slots.push({
          type: 'telegram-gift',
          telegramGiftId: slice.telegramGiftId,
          starCount: slice.starCount,
          name: slice.name,
          image: slice.image ?? '',
          price: slice.starCount,
        });
      }

      for (let i = 0; i < noLootSlotsCount; i++) {
        slots.push({
          type: 'no-loot',
          price: 0,
          image: '',
          name: 'No loot',
        });
      }

      return slots;
    }

    if (amount >= 10 && amount < 20) {
      const desiredSlots = 9;
      const baseGifts = allRawGifts.slice(0, Math.max(1, Math.min(desiredSlots, allRawGifts.length)));

      // Дублируем подарки, если их меньше 10, чтобы набрать 10 слотов
      while (baseGifts.length < desiredSlots && allRawGifts.length > 0) {
        baseGifts.push(allRawGifts[baseGifts.length % allRawGifts.length]);
      }

      originalGifts = baseGifts;

      if (onOriginalData) {
        onOriginalData(originalGifts);
      }

      return originalGifts.map((g: any) =>
        formatGiftItem(g, 'gift'),
      );
    }

    // Дефолтный случай — старая логика
    originalGifts = allRawGifts.slice(0, Math.min(getCountGifts(amount), 9));
    
    if (onOriginalData) {
      onOriginalData(originalGifts);
    }

    return originalGifts.map((g: any) =>
      formatGiftItem(g, 'gift'),
    );
  }

  private async getRawMoneyPrices(amount: number) {
    const rates = await this.currancyService.getCurrancyRates();
    const ton = Number(rates?.ton);
    const stars = Number(rates?.stars);
    const tonToStarsRate =
      Number.isFinite(ton) && ton > 0 && Number.isFinite(stars) && stars > 0
        ? ton / stars
        : 50;
    return getMoneyPrices(amount, tonToStarsRate);
  }

  /**
   * Заменяет часть секторов типа gift на TON/STARS (~18% барабана), без отдельного режима «multi».
   */
  private async mergeMoneyIntoGiftWheel(baseSlots: any[], tonAmount: number): Promise<any[]> {
    const moneyRaw = await this.getRawMoneyPrices(tonAmount);
    const { items, weights } = moneyRaw;
    const sumW = weights.reduce((a, b) => a + b, 0);
    if (sumW <= 0 || items.length === 0) {
      return baseSlots;
    }

    const pickVariant = () => {
      let r = Math.random() * sumW;
      for (let i = 0; i < items.length; i++) {
        r -= weights[i];
        if (r <= 0) {
          return items[i];
        }
      }
      return items[items.length - 1];
    };

    const n = baseSlots.length;
    const moneySlotTarget = Math.max(1, Math.round(n * 0.18));
    const giftIndices = baseSlots
      .map((s, i) => (s.type === 'gift' ? i : -1))
      .filter((i) => i >= 0);
    if (giftIndices.length === 0) {
      return baseSlots;
    }

    const m = Math.min(moneySlotTarget, giftIndices.length);
    const shuffled = [...giftIndices];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const out = [...baseSlots];
    for (let k = 0; k < m; k++) {
      const idx = shuffled[k];
      out[idx] = formatMoneyItem(pickVariant());
    }
    return out;
  }

  private async saveWheelToRedis(
    userId: string,
    formattedItems: any[],
    originalData: any[],
    amount?: number,
    currencyType?: 'ton' | 'stars',
    weights?: number[],
  ): Promise<void> {
    try {
      const wheelItems: WheelItem[] = formattedItems.map((item, index) => {
        // Для secret элементов нужно найти соответствующий оригинальный элемент
        let original = originalData[index];
        
        // Если это secret и originalData содержит комбинированные данные
        if (item.type === 'secret' && originalData.length > 0) {
          // Ищем элемент в originalData по типу
          const matchingOriginal = originalData.find((orig: any) => {
            if (item.name === 'TON' || item.name === 'STARS') {
              return orig.type === 'ton' || orig.type === 'star';
            }
            return orig.address || orig.collection?.address;
          });
          if (matchingOriginal) {
            original = matchingOriginal;
          }
        }

        // Для обычных подарков/денег без originalData пробуем маппить по модулю,
        // чтобы дубликаты слотов ссылались на реальные исходники
        if (
          !original &&
          originalData.length > 0 &&
          item.type !== 'no-loot' &&
          item.type !== 'telegram-gift'
        ) {
          original = originalData[index % originalData.length];
        }
        
        return formatWheelItem(item, original || item);
      });

      const wheelKey = `wheel:${userId}`;
      const wheelValue = JSON.stringify(wheelItems);
      await this.redisService.set(wheelKey, wheelValue, this.WHEEL_TTL_SECONDS);

      // Сохраняем amount и currencyType отдельно
      if (amount !== undefined) {
        const amountKey = `wheel:amount:${userId}`;
        const amountData = JSON.stringify({
          amount,
          currencyType: currencyType || 'ton',
        });
        await this.redisService.set(amountKey, amountData, this.WHEEL_TTL_SECONDS);
        this.logger.debug(`Saved amount ${amount} ${currencyType || 'ton'} for user ${userId}`);
      }

      if (weights && weights.length === wheelItems.length) {
        const weightsKey = `wheel:weights:${userId}`;
        await this.redisService.set(weightsKey, JSON.stringify(weights), this.WHEEL_TTL_SECONDS);
        this.logger.debug(`Saved ${weights.length} weights for user ${userId}`);
      }
      
      this.logger.debug(`Saved wheel for user ${userId} with ${wheelItems.length} items`);
    } catch (error) {
      this.logger.error(`Failed to save wheel to Redis for user ${userId}: ${error.message}`);
      // Не прерываем выполнение, если не удалось сохранить в Redis
    }
  }

  async claimTelegramGift(
    userId: string,
    action: 'gift' | 'currency',
  ): Promise<{ success: boolean; credited?: number }> {
    const pendingKey = `pending-tg-gift:${userId}`;
    const raw = await this.redisService.get(pendingKey);
    if (!raw) {
      throw new HttpException(
        'Ожидающий подарок не найден или срок его хранения истёк',
        HttpStatus.NOT_FOUND,
      );
    }

    const pending: {
      telegramGiftId: string;
      telegramUserId: string;
      starCount: number;
      name: string;
      image: string;
    } = JSON.parse(raw);

    await this.redisService.del(pendingKey);

    if (action === 'gift') {
      this.scheduleTelegramGiftDelivery(
        pending.telegramUserId,
        pending.telegramGiftId,
        userId,
      );
      return { success: true };
    } else {
      await this.usersService.updateStarsBalance(userId, pending.starCount);
      this.logger.debug(
        `User ${userId} exchanged telegram gift for ${pending.starCount} stars`,
      );
      return { success: true, credited: pending.starCount };
    }
  }

  /**
   * Отправка подарка в Telegram не блокирует ответ startGame (колесо не ждёт паузу).
   */
  private scheduleTelegramGiftDelivery(
    telegramUserId: string,
    telegramGiftId: string,
    userId: string,
  ): void {
    const ms = this.telegramGiftSendDelayMs;
    const run = () => {
      void this.telegramStarGiftsService
        .sendGiftToUser(telegramUserId, telegramGiftId)
        .then((sent) => {
          if (!sent) {
            this.logger.warn(
              `Telegram sendGift failed for user ${userId}, gift ${telegramGiftId}`,
            );
          }
        });
    };
    if (ms <= 0) {
      run();
      return;
    }
    this.logger.debug(
      `Telegram gift ${telegramGiftId} for user ${userId}: sendGift через ${ms} мс`,
    );
    setTimeout(run, ms);
  }

  async startGame(userId: string): Promise<StartGameResponseDto> {
    try {
      const key = `wheel:${userId}`;
      const wheelData = await this.redisService.get(key);

      if (!wheelData) {
        throw new HttpException(
          'Wheel not found. Please generate a new wheel first.',
          HttpStatus.NOT_FOUND,
        );
      }

      // Получаем сохраненный amount из Redis
      const amountKey = `wheel:amount:${userId}`;
      const amountData = await this.redisService.get(amountKey);

      if (!amountData) {
        throw new HttpException(
          'Game amount not found. Please generate a new wheel first.',
          HttpStatus.NOT_FOUND,
        );
      }

      const { amount: rawAmount, currencyType } = JSON.parse(amountData);
      
      this.logger.debug(
        `Starting game for user ${userId}: amount=${rawAmount}, currencyType=${currencyType}`,
      );
      
      // Нормализуем amount в число
      const amount = Number(rawAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new HttpException(
          'Invalid game amount',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Получаем баланс пользователя из базы данных
      const balance = await this.usersService.getBalance(userId);

      // Проверяем баланс в зависимости от типа валюты
      // Нормализуем баланс: если null/undefined, считаем 0
      const userBalance = currencyType === 'stars' 
        ? (balance.starsBalance ?? 0) 
        : (balance.tonBalance ?? 0);

      this.logger.debug(
        `User ${userId} balance check: currencyType=${currencyType}, userBalance=${userBalance}, requiredAmount=${amount}`,
      );

      if (userBalance < amount) {
        this.logger.warn(
          `User ${userId} has insufficient balance. Required: ${amount} ${currencyType}, Available: ${userBalance}`,
        );
        throw new HttpException(
          `Insufficient balance. Required: ${amount} ${currencyType}, Available: ${userBalance}`,
          HttpStatus.PAYMENT_REQUIRED,
        );
      }

      this.logger.debug(
        `User ${userId} has sufficient balance: ${userBalance} ${currencyType} >= ${amount} ${currencyType}`,
      );

      const wheelItems: WheelItem[] = JSON.parse(wheelData);

      if (!wheelItems || wheelItems.length === 0) {
        throw new HttpException(
          'Wheel is empty. Please generate a new wheel first.',
          HttpStatus.BAD_REQUEST,
        );
      }

      let randomIndex: number;
      const weightsKey = `wheel:weights:${userId}`;
      const weightsData = await this.redisService.get(weightsKey);
      if (weightsData) {
        const weights: number[] = JSON.parse(weightsData);
        if (weights.length === wheelItems.length) {
          const total = weights.reduce((a, b) => a + b, 0);
          let r = Math.random() * total;
          randomIndex = weights.length - 1;
          for (let i = 0; i < weights.length; i++) {
            r -= weights[i];
            if (r <= 0) {
              randomIndex = i;
              break;
            }
          }
        } else {
          randomIndex = Math.floor(Math.random() * wheelItems.length);
        }
      } else {
        randomIndex = Math.floor(Math.random() * wheelItems.length);
      }
      const selectedPrize = wheelItems[randomIndex];

      this.logger.debug(
        `User ${userId} selected prize at index ${randomIndex}: ${(selectedPrize as any).type}`,
      );

      // Если приз — NFT (есть ownerAddress, который у нас равен sale_address), пытаемся купить его
      if ((selectedPrize as any).ownerAddress && typeof (selectedPrize as any).price === 'number') {
        try {
          const url = `${this.nftBuyerUrl}/api/nft/purchase`;

          // price в колесе хранится в TON → конвертим в nanoTON и добавляем комиссию
          const priceTon = (selectedPrize as any).price as number;
          const basePriceNano = BigInt(Math.round(priceTon * 1_000_000_000));
          const feeNano = 300000000n; // ~0.3 TON комиссии
          const priceNano = (basePriceNano + feeNano).toString();

          await this.axiosInstance.post(url, {
            sale_address: (selectedPrize as any).ownerAddress, // ownerAddress == sale_address
            price: priceNano,
          });

          this.logger.debug(
            `Requested NFT purchase for user ${userId}, sale_address=${(selectedPrize as any).ownerAddress}, price=${priceNano}`,
          );
        } catch (error: any) {
          this.logger.error(
            `Failed to purchase NFT for user ${userId}: ${error?.message || error}`,
          );
          // Игру не роняем, просто логируем ошибку покупки
        }
      }

      // Списываем стоимость игры с баланса пользователя
      if (currencyType === 'stars') {
        await this.usersService.updateStarsBalance(userId, -amount);
      } else {
        await this.usersService.updateTonBalance(userId, -amount);
      }

      this.logger.debug(
        `User ${userId} paid ${amount} ${currencyType} for the game`,
      );

      // Запись в user_games при каждом запуске игры
      this.logger.debug(
        `Creating game record for user ${userId}: solo, ${amount} ${currencyType}`,
      );
      const userGame = await this.giftsRepository.createUserGame({
        userId,
        type: UserGamesType.solo,
        priceAmount: amount,
        priceType: currencyType === 'stars' ? GameCurrancy.STARS : GameCurrancy.TON,
      });

      // Если выпал no-loot — это пустой слот: только списание, без выигрыша
      if ((selectedPrize as any).type === 'no-loot') {
        this.logger.debug(`User ${userId} landed on no-loot slot. Only bet deducted, no prize awarded.`);
        // Возвращаем минимальный ответ без выигрыша
        return {
          type: 'gift',
          name: 'No loot',
          price: 0,
        } as StartGameResponseDto;
      }

      // Обрабатываем выигрыш в зависимости от типа приза
      if (selectedPrize.type === 'money') {
        const moneyPrize = selectedPrize as WheelMoneyItem;
        const prizeAmount = moneyPrize.amount;
        const prizeCurrencyType = moneyPrize.currencyType;

        // Инкрементируем баланс пользователя
        if (prizeCurrencyType === 'star') {
          await this.usersService.updateStarsBalance(userId, prizeAmount);
        } else {
          await this.usersService.updateTonBalance(userId, prizeAmount);
        }

        this.logger.debug(
          `User ${userId} won ${prizeAmount} ${prizeCurrencyType}`,
        );
      } else if (selectedPrize.type === 'telegram-gift') {
        const tgPrize = selectedPrize as WheelTelegramGiftItem;
        if (!tgPrize.telegramGiftId) {
          throw new HttpException(
            'Некорректный слот подарка Telegram',
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }
        const user = await this.usersService.findUserById(userId);
        if (!user?.telegramId) {
          throw new HttpException(
            'Не найден Telegram-профиль для отправки подарка',
            HttpStatus.BAD_REQUEST,
          );
        }

        await this.winsService.recordWin({
          image: tgPrize.image ?? '',
          lottieUrl: '',
          name: tgPrize.name,
        });

        // Сохраняем ожидающий выбор пользователя в Redis (TTL 24ч)
        await this.redisService.set(
          `pending-tg-gift:${userId}`,
          JSON.stringify({
            telegramGiftId: tgPrize.telegramGiftId,
            telegramUserId: user.telegramId,
            starCount: tgPrize.starCount,
            name: tgPrize.name,
            image: tgPrize.image ?? '',
          }),
          86400,
        );

        return {
          type: 'telegram-gift',
          name: tgPrize.name,
          price: tgPrize.starCount,
          image: tgPrize.image,
          telegramGiftId: tgPrize.telegramGiftId,
        };
      } else if (selectedPrize.type === 'gift') {
        const giftPrize = selectedPrize as WheelGiftItem;

        let lottieUrl = giftPrize.lottie;
        if (!lottieUrl && giftPrize.address) {
          try {
            const nftDetailUrl = `${this.nftBuyerUrl}/api/nft/${encodeURIComponent(giftPrize.address)}`;
            const nftRes = await this.axiosInstance.get(nftDetailUrl);
            lottieUrl = nftRes.data?.media?.lottie ?? nftRes.data?.metadata?.lottie ?? '';
          } catch (e) {
            this.logger.debug(`Could not fetch lottie for gift ${giftPrize.address}: ${(e as Error).message}`);
          }
        }

        const createdGift = await this.usersService.createUserGift({
          userId,
          giftName: giftPrize.name,
          giftAddress: giftPrize.address,
          collectionAddress: giftPrize.collection.address,
          image: giftPrize.image,
          price: giftPrize.price,
          lottieUrl: lottieUrl || undefined,
        });

        this.logger.debug(
          `User ${userId} won gift: ${giftPrize.name}`,
        );

        await this.winsService.recordWin({
          image: createdGift.image,
          lottieUrl: createdGift.lottieUrl,
          name: createdGift.giftName,
        });

        await this.giftsRepository.linkUserGameWinGift(userGame.id, createdGift.id);

        return {
          ...formatMinimalPrize(selectedPrize),
          giftId: createdGift.id,
        };
      } else if (selectedPrize.type === 'secret') {
        const secretPrize = selectedPrize as WheelSecretItem;
        
        if (secretPrize.realType === 'money') {
          const prizeAmount = secretPrize.amount || 0;
          const prizeCurrencyType = secretPrize.currencyType;

          if (!prizeCurrencyType) {
            this.logger.error(`Secret prize with realType='money' missing currencyType`);
            throw new HttpException(
              'Invalid secret prize configuration',
              HttpStatus.INTERNAL_SERVER_ERROR,
            );
          }

          // Инкрементируем баланс пользователя
          if (prizeCurrencyType === 'star') {
            await this.usersService.updateStarsBalance(userId, prizeAmount);
          } else {
            await this.usersService.updateTonBalance(userId, prizeAmount);
          }

          this.logger.debug(
            `User ${userId} won secret money: ${prizeAmount} ${prizeCurrencyType}`,
          );
        } else if (secretPrize.realType === 'gift') {
          if (!secretPrize.address || !secretPrize.name) {
            this.logger.error(`Secret prize with realType='gift' missing required fields`);
            throw new HttpException(
              'Invalid secret gift prize configuration',
              HttpStatus.INTERNAL_SERVER_ERROR,
            );
          }

          let secretLottieUrl = secretPrize.lottie;
          if (!secretLottieUrl && secretPrize.address) {
            try {
              const nftDetailUrl = `${this.nftBuyerUrl}/api/nft/${encodeURIComponent(secretPrize.address)}`;
              const nftRes = await this.axiosInstance.get(nftDetailUrl);
              secretLottieUrl = nftRes.data?.media?.lottie ?? nftRes.data?.metadata?.lottie ?? '';
            } catch (e) {
              this.logger.debug(`Could not fetch lottie for secret gift ${secretPrize.address}: ${(e as Error).message}`);
            }
          }

          const createdGift = await this.usersService.createUserGift({
            userId,
            giftName: secretPrize.name,
            giftAddress: secretPrize.address,
            collectionAddress: secretPrize.collection?.address,
            image: secretPrize.image,
            price: secretPrize.price,
            lottieUrl: secretLottieUrl || undefined,
          });

          this.logger.debug(
            `User ${userId} won secret gift: ${secretPrize.name}`,
          );

          await this.winsService.recordWin({
            image: createdGift.image,
            lottieUrl: createdGift.lottieUrl,
            name: createdGift.giftName,
          });

          await this.giftsRepository.linkUserGameWinGift(userGame.id, createdGift.id);

          return {
            ...formatMinimalPrize(selectedPrize),
            giftId: createdGift.id,
          };
        }
      }

      // Форматируем в минимальный формат для клиента
      return formatMinimalPrize(selectedPrize);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Error starting game for user ${userId}: ${error.message}`);
      throw new HttpException(
        'Failed to start game',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async buyNFT(userId: string, nftId: string) {
    const gift = await this.usersService.findUserGiftById(userId, nftId);
    if (!gift) {
      throw new BadRequestException('Подарок не найден');
    }
    if (gift.isOut) {
      throw new BadRequestException('Подарок уже продан');
    }
    const price = gift.price ?? 0;
    const refundAmount = Math.round(price * 0.8 * 100) / 100; // 80% от стоимости

    await this.usersService.markUserGiftsAsOut(userId, [nftId]);
    await this.usersService.updateTonBalance(userId, refundAmount);

    return {
      success: true,
      refundAmount,
      giftName: gift.giftName,
    };
  }

  /**
   * Получает минимальную ставку в TON, при которой nftBuyer возвращает непустой массив подарков.
   * Результат кешируется в Redis на 5 минут.
   */
  async getMinPriceTon(): Promise<number> {
    const cached = await this.redisService.get(this.MIN_PRICE_REDIS_KEY);
    if (cached != null) {
      const value = parseFloat(cached);
      if (!Number.isNaN(value)) return value;
    }

    const url = `${this.nftBuyerUrl}/api/nft/gifts/by-price`;
    let amountTon = this.minPriceProbeStep;

    while (amountTon <= 100) {
      try {
        const response = await this.axiosInstance.post(url, { amount: amountTon });
        const gifts: any[] = response.data?.gifts ?? [];
        if (Array.isArray(gifts) && gifts.length > 0) {
          await this.redisService.set(
            this.MIN_PRICE_REDIS_KEY,
            String(amountTon),
            this.MIN_PRICE_TTL_SECONDS,
          );
          this.logger.debug(`Min price (TON) cached: ${amountTon}`);
          return amountTon;
        }
      } catch (err) {
        this.logger.warn(`Probe min price at ${amountTon} TON failed: ${(err as Error).message}`);
      }
      amountTon += this.minPriceProbeStep;
    }

    const fallback = 1;
    await this.redisService.set(
      this.MIN_PRICE_REDIS_KEY,
      String(fallback),
      this.MIN_PRICE_TTL_SECONDS,
    );
    return fallback;
  }

  /**
   * Минимальная ставка для UI и клиента (фиксированные значения продукта).
   */
  async getMinPrice(): Promise<{ ton: number; stars: number }> {
    return {
      ton: MIN_PRODUCT_STAKE_TON,
      stars: MIN_PRODUCT_STAKE_STARS,
    };
  }

  private async getTonAmount(amount: number, currencyType: 'ton' | 'stars') {
    const currancyRates = await this.currancyService.getCurrancyRates();
    console.log('currancyRates', currancyRates);
    if (currencyType === 'ton') {
      return amount;
    } else {
      // amount приходит в STARS:
      // stars * (цена STARS в USD) / (цена TON в USD) = эквивалент в TON
      const ton = Number(currancyRates?.ton);
      const stars = Number(currancyRates?.stars);
      const tonAmount =
        Number.isFinite(ton) && ton > 0 && Number.isFinite(stars) && stars >= 0
          ? (amount * stars) / ton
          : amount;
      const rounded = Number(tonAmount.toFixed(2));
      return Number.isFinite(rounded) ? rounded : 0;
    }
  }
}
