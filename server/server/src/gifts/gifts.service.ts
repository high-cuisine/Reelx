import { Injectable, Logger, HttpException, HttpStatus, InternalServerErrorException } from '@nestjs/common';
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

@Injectable()
export class GiftsService {
  private readonly logger = new Logger(GiftsService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly nftBuyerUrl: string;
  private readonly WHEEL_TTL_SECONDS = 10 * 60; // 10 минут

  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
    private usersService: UsersService,
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
      
      // Определяем тип подарков на основе amount
      const giftType = getCurrentType(amount);

      this.logger.debug(`Getting gifts by type: ${giftType} for amount: ${amount}, currency: ${currencyType || 'not specified'}`);

      let result: any;
      let originalData: any[] = [];

      switch (giftType) {
        case 'common':
          const commonResult = await this.getGiftsPrices(amount, currencyType, (data) => {
            originalData = data;
          });
          result = commonResult;
          break;
        
        case 'multi':
          result = this.getMoneyPrices(amount);
          // Для money создаем оригинальные данные из отформатированных
          originalData = result.map((item: any) => ({
            type: item.name === 'TON' ? 'ton' : 'star',
            price: item.price,
          }));
          break;
        
        case 'secret':
          const secretResult = await this.getSecretsPrices(amount, (data) => {
            originalData = data;
          });
          result = secretResult;
          break;
        
        default:
          this.logger.warn(`Unknown type: ${giftType}, falling back to common`);
          const defaultResult = await this.getGiftsPrices(amount, currencyType, (data) => {
            originalData = data;
          });
          result = defaultResult;
      }

      // Сохраняем барабан в Redis, если есть userId
      if (userId && result && Array.isArray(result)) {
        await this.saveWheelToRedis(userId, result, originalData, amount, currencyType);
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
    const amountTon = convertAmountToTon(amount, inputCurrency);

    // В nftbuyber отправляем ТОЛЬКО amount в TON
    this.logger.debug(
      `Proxying request to ${url} with body: ${JSON.stringify({ amount: amountTon })} (from ${amount} ${inputCurrency})`,
    );

    const response = await this.axiosInstance.post(url, { amount: amountTon });

    //if(response.status !== 200) throw new InternalServerErrorException()

    const type = getCurrentType(Number(amount));

    const originalGifts = response.data.gifts.slice(0, getCountGifts(amount));
    
    // Сохраняем оригинальные данные для Redis
    if (onOriginalData) {
      onOriginalData(originalGifts);
    }

    const gifts = originalGifts.map((g: any) => formatGiftItem(g, type === 'secret' ? 'secret' : 'gift'));

    return gifts;
  }

  private getRawMoneyPrices(amount: number) {
    return getMoneyPrices(amount);
  }

  private getMoneyPrices(amount: number) {
    return formatMoneyItems(this.getRawMoneyPrices(amount));
  }

  private async getSecretsPrices(
    amount: number,
    onOriginalData?: (data: any[]) => void,
  ) {
    let originalGiftsData: any[] = [];
    
    const gifts = await this.getGiftsPrices(amount, undefined, (data) => {
      originalGiftsData = data;
    });
    
    const moneyPrices = this.getRawMoneyPrices(amount);

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

      const { amount, currencyType } = JSON.parse(amountData);

      // Получаем баланс пользователя из базы данных
      const balance = await this.usersService.getBalance(userId);

      // Проверяем баланс в зависимости от типа валюты
      const userBalance = currencyType === 'stars' ? balance.starsBalance : balance.tonBalance;

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
        `User ${userId} selected prize at index ${randomIndex}: ${selectedPrize.type}`,
      );

      // Списываем стоимость игры с баланса пользователя
      if (currencyType === 'stars') {
        await this.usersService.updateStarsBalance(userId, -amount);
      } else {
        await this.usersService.updateTonBalance(userId, -amount);
      }

      this.logger.debug(
        `User ${userId} paid ${amount} ${currencyType} for the game`,
      );

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

  private setPricesInCache() {

  }
}
