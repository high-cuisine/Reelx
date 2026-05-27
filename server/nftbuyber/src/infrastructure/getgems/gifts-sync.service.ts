import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { GetGemsApiClient } from './getgems-api.client';
import { RedisService } from '../redis/redis.service';
import { GiftCollection, GiftCollectionCache } from './interfaces/getgems-response.interface';

@Injectable()
export class GiftsSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GiftsSyncService.name);
  private readonly REDIS_KEY = 'gifts:collections:all';
  private readonly SYNC_INTERVAL = 30 * 60 * 1000; // 30 минут в миллисекундах
  private isRunning = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private syncPromise: Promise<void> | null = null;

  constructor(
    private readonly getGemsClient: GetGemsApiClient,
    private readonly redisService: RedisService,
  ) {}

  async onModuleInit() {
    // Запускаем первую синхронизацию при старте приложения (не блокируем старт)
    this.logger.log('Starting initial gifts collections sync...');
    this.syncCollections().catch(error => {
      this.logger.error(`Initial sync failed: ${error.message}`);
      this.logger.warn('Application will continue without initial gift collections data');
    });

    // Устанавливаем интервал для автоматической синхронизации каждые 30 минут
    this.syncInterval = setInterval(async () => {
      this.logger.log('Running scheduled sync...');
      await this.syncCollections();
    }, this.SYNC_INTERVAL);

    this.logger.log(`Scheduled sync every ${this.SYNC_INTERVAL / 60000} minutes`);
  }

  onModuleDestroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.logger.log('Sync interval cleared');
    }
  }

  // Также можно запускать вручную через этот метод
  async syncCollections(): Promise<void> {
    if (this.syncPromise) {
      this.logger.warn('Sync already in progress, waiting...');
      return this.syncPromise;
    }

    this.syncPromise = this.runSyncCollections();

    try {
      await this.syncPromise;
    } finally {
      this.syncPromise = null;
    }
  }

  private async runSyncCollections(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Sync already in progress, skipping...');
      return;
    }

    this.isRunning = true;

    try {
      this.logger.log('Starting gifts collections synchronization...');
      const startTime = Date.now();

      // Получаем все коллекции из GetGems API
      const collections = await this.getGemsClient.getAllGiftsCollections();

      // Формируем объект для кеша
      const cacheData: GiftCollectionCache = {
        collections,
        lastUpdated: Date.now(),
      };

      // Сохраняем в Redis
      await this.redisService.set(
        this.REDIS_KEY,
        JSON.stringify(cacheData)
      );

      // Также сохраняем индекс по адресам для быстрого поиска
      for (const collection of collections) {
        const key = `gifts:collection:${collection.address}`;
        await this.redisService.set(
          key,
          JSON.stringify(collection)
        );
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Successfully synced ${collections.length} gift collections in ${duration}ms`
      );
    } catch (error) {
      this.logger.error(`Error syncing gift collections: ${error.message}`, error.stack);
    } finally {
      this.isRunning = false;
    }
  }

  async getAllCollections(): Promise<GiftCollection[]> {
    try {
      let cached = await this.redisService.get(this.REDIS_KEY);

      if (!cached) {
        this.logger.warn('No cached collections found, triggering sync...');
        await this.syncCollections();
        cached = await this.redisService.get(this.REDIS_KEY);
      }

      if (!cached) {
        return [];
      }

      const data: GiftCollectionCache = JSON.parse(cached);
      this.logger.debug(
        `Retrieved ${data.collections.length} collections from cache (last updated: ${new Date(data.lastUpdated).toISOString()})`,
      );

      return data.collections;
    } catch (error) {
      this.logger.error(`Error getting collections from cache: ${error.message}`);
      return [];
    }
  }

  async getCollectionByAddress(address: string): Promise<GiftCollection | null> {
    try {
      const key = `gifts:collection:${address}`;
      const cached = await this.redisService.get(key);
      
      if (!cached) {
        return null;
      }

      return JSON.parse(cached);
    } catch (error) {
      this.logger.error(`Error getting collection ${address} from cache: ${error.message}`);
      return null;
    }
  }

  async getCacheInfo(): Promise<{ collectionCount: number; lastUpdated: Date | null }> {
    try {
      const cached = await this.redisService.get(this.REDIS_KEY);
      
      if (!cached) {
        return { collectionCount: 0, lastUpdated: null };
      }

      const data: GiftCollectionCache = JSON.parse(cached);
      return {
        collectionCount: data.collections.length,
        lastUpdated: new Date(data.lastUpdated),
      };
    } catch (error) {
      this.logger.error(`Error getting cache info: ${error.message}`);
      return { collectionCount: 0, lastUpdated: null };
    }
  }
}
