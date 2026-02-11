import { BadRequestException, Injectable, Logger, HttpException, HttpStatus, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { getCurrentType } from './helpers/getCurrectType.helper';
import { getCountGifts } from './helpers/getCountGifts.helper';
import { getMoneyPrices } from './helpers/getMoneyPrices.helper';
import { combineGiftsAndMoney } from './helpers/combineGiftsAndMoney.helper';
import { formatGiftItem, formatMoneyItems } from './helpers/formatGiftItem.helper';
import { formatSecrets } from './helpers/formatSecrets.helper';
import { convertAmountToTon } from './helpers/convertAmountToTon.helper';
import { RedisService } from '../../libs/infrustructure/redis/redis.service';
import { formatWheelItem } from './helpers/formatWheelItem.helper';
import { WheelItem, WheelGiftItem, WheelMoneyItem, WheelSecretItem } from './interfaces/wheel-item.interface';
import { formatMinimalPrize } from './helpers/formatMinimalPrize.helper';
import { StartGameResponseDto } from './dto/start-game-response.dto';
import { UsersService } from '../users/services/users.service';
import { UserGamesType, GameCurrancy } from '@prisma/client';
import { CurrancyService } from '../../libs/common/modules/Currancy/services/Currancy.service';
import { GiftsRepository } from './repositorys/gifts.repository';

@Injectable()
export class GiftsService {
  private readonly logger = new Logger(GiftsService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly nftBuyerUrl: string;
  private readonly WHEEL_TTL_SECONDS = 10 * 60; // 10 минут
  private readonly MIN_PRICE_REDIS_KEY = 'gifts:min_price_ton';
  private readonly MIN_PRICE_TTL_SECONDS = 5 * 60; // 5 минут
  private readonly MIN_PRICE_PROBE_STEP = 0.5; // шаг увеличения ставки при поиске мин. цены (TON)

  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
    private usersService: UsersService,
    private giftsRepository: GiftsRepository,
    private currancyService: CurrancyService,
  ) {
    this.nftBuyerUrl = this.configService.get<string>('NFT_BUYER_URL', 'http://localhost:3001');
    
    if (!this.nftBuyerUrl) {
      this.logger.warn('NFT_BUYER_URL not found in environment variables');
    }

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

      const tonAmount = await this.getTonAmount(amount, currencyType as 'ton' | 'stars');

      console.log('tonAmount', tonAmount);
      
      // Определяем тип подарков на основе amount
      const giftType = getCurrentType(tonAmount);
      
      this.logger.debug(`Getting gifts by type: ${giftType} for amount: ${amount}, currency: ${currencyType || 'not specified'}`);

      let result: any;
      let originalData: any[] = [];

      switch (giftType) {
        case 'common':
          const commonResult = await this.getGiftsPrices(tonAmount, 'ton', (data) => {
            originalData = data;
          });
          result = commonResult;
          break;
        
        case 'multi':
          result = await this.getMoneyPrices(tonAmount);
          // Для money создаем оригинальные данные из отформатированных
          originalData = result.map((item: any) => ({
            type: item.name === 'TON' ? 'ton' : 'star',
            price: item.price,
          }));
          break;
        
        case 'secret':
          const secretResult = await this.getSecretsPrices(tonAmount, (data) => {
            originalData = data;
          });
          result = secretResult;
          break;
        
        default:
          this.logger.warn(`Unknown type: ${giftType}, falling back to common`);
          const defaultResult = await this.getGiftsPrices(amount, 'ton', (data) => {
            originalData = data;
          });
          result = defaultResult;
      }

      // Сохраняем барабан в Redis, если есть userId
      if (userId && result && Array.isArray(result)) {
        // Передаем правильный currencyType из запроса (или 'ton' по умолчанию)
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
    const type = getCurrentType(Number(amount));

    const allRawGifts: any[] = response.data.gifts || [];

    let originalGifts: any[] = [];

    // Правила формирования слотов:
    // 1) amount <= 5: 4 подарка + no-loot, при этом вероятность:
    //    4 * 5% (подарки) + 80% (no-loot) — реализуем через 20 слотов:
    //    4 подарка по 1 слоту и 16 слотов no-loot
    // 2) 10 <= amount < 20: 10 игрушек по 10% (10 слотов, без no-loot)
    // 3) остальное — старая логика (getCountGifts)

    if (amount <= 5) {
      const maxGifts = Math.min(4, allRawGifts.length);
      originalGifts = allRawGifts.slice(0, maxGifts);

      if (onOriginalData) {
        onOriginalData(originalGifts);
      }

      const formattedGifts = originalGifts.map((g: any) =>
        formatGiftItem(g, type === 'secret' ? 'secret' : 'gift'),
      );

      const totalSlots = 20;
      const noLootShare = 0.6; // 60% слотов — no-loot
      const noLootSlotsCount = Math.round(totalSlots * noLootShare); // 12 из 20
      let giftSlotsToDistribute = Math.max(0, totalSlots - noLootSlotsCount); // оставшиеся 8 слотов под подарки

      const slots: any[] = [];

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

      // Распределяем оставшиеся слоты равномерно между подарками
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

      // Добавляем no-loot слоты (60% от барабана)
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
      const desiredSlots = 10;
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
        formatGiftItem(g, type === 'secret' ? 'secret' : 'gift'),
      );
    }

    // Дефолтный случай — старая логика
    originalGifts = allRawGifts.slice(0, getCountGifts(amount));
    
    if (onOriginalData) {
      onOriginalData(originalGifts);
    }

    return originalGifts.map((g: any) =>
      formatGiftItem(g, type === 'secret' ? 'secret' : 'gift'),
    );
  }

  private async getRawMoneyPrices(amount: number) {
    const rates = await this.currancyService.getCurrancyRates();
    // Курс конвертации: сколько STARS за 1 TON
    const tonToStarsRate = rates.ton / rates.stars;
    return getMoneyPrices(amount, tonToStarsRate);
  }

  private async getMoneyPrices(amount: number) {
    return formatMoneyItems(await this.getRawMoneyPrices(amount));
  }

  private async getSecretsPrices(
    amount: number,
    onOriginalData?: (data: any[]) => void,
  ) {
    let originalGiftsData: any[] = [];
    
    const gifts = await this.getGiftsPrices(amount, undefined, (data) => {
      originalGiftsData = data;
    });
    
    const moneyPrices = await this.getRawMoneyPrices(amount);

    const secrets = combineGiftsAndMoney(originalGiftsData, moneyPrices, 8);
    
    // Сохраняем комбинированные оригинальные данные
    if (onOriginalData) {
      onOriginalData(secrets);
    }
    
    return formatSecrets(secrets);
  }

  private async saveWheelToRedis(
    userId: string,
    formattedItems: any[],
    originalData: any[],
    amount?: number,
    currencyType?: 'ton' | 'stars',
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
        if (!original && originalData.length > 0 && item.type !== 'no-loot') {
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
      
      this.logger.debug(`Saved wheel for user ${userId} with ${wheelItems.length} items`);
    } catch (error) {
      this.logger.error(`Failed to save wheel to Redis for user ${userId}: ${error.message}`);
      // Не прерываем выполнение, если не удалось сохранить в Redis
    }
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

      // Случайный выбор приза
      const randomIndex = Math.floor(Math.random() * wheelItems.length);
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
      await this.giftsRepository.createUserGame({
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
      } else if (selectedPrize.type === 'gift') {
        const giftPrize = selectedPrize as WheelGiftItem;
        
        // Создаем запись в UserGifts
        await this.usersService.createUserGift({
          userId,
          giftName: giftPrize.name,
          giftAddress: giftPrize.address,
          collectionAddress: giftPrize.collection.address,
          image: giftPrize.image,
          price: giftPrize.price,
        });

        this.logger.debug(
          `User ${userId} won gift: ${giftPrize.name}`,
        );
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

          // Создаем запись в UserGifts
          await this.usersService.createUserGift({
            userId,
            giftName: secretPrize.name,
            giftAddress: secretPrize.address,
            collectionAddress: secretPrize.collection?.address,
            image: secretPrize.image,
            price: secretPrize.price,
          });

          this.logger.debug(
            `User ${userId} won secret gift: ${secretPrize.name}`,
          );
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
    let amountTon = this.MIN_PRICE_PROBE_STEP;

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
      amountTon += this.MIN_PRICE_PROBE_STEP;
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
   * Возвращает минимальную ставку в TON и в STARS для клиента (с учётом курса).
   */
  async getMinPrice(): Promise<{ ton: number; stars: number }> {
    const minPriceTon = await this.getMinPriceTon();
    const rates = await this.currancyService.getCurrancyRates();
    // minPriceTon TON = minPriceTon * rates.ton USD; в STARS это (minPriceTon * rates.ton) / rates.stars
    const minPriceStarsRaw =
      rates.stars > 0
        ? (minPriceTon * rates.ton) / rates.stars
        : minPriceTon * 10;
    const minPriceStars = Math.ceil(minPriceStarsRaw / 100) * 100;
    return {
      ton: Number(minPriceTon.toFixed(2)),
      stars: minPriceStars,
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
      const tonAmount =
        currancyRates.ton > 0
          ? (amount * currancyRates.stars) / currancyRates.ton
          : amount;
      return Number(tonAmount.toFixed(2));
    }
  }
}
