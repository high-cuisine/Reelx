import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TonApiClient } from '../tonapi/tonapi.client';
import { GetGemsGraphQlClient } from './getgems-graphql.client';
import { RedisService } from '../redis/redis.service';
import { GiftCollection, GiftCollectionCache } from './interfaces/getgems-response.interface';

@Injectable()
export class GiftsSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GiftsSyncService.name);
  private readonly REDIS_KEY = 'gifts:collections:all';
  private readonly SYNC_INTERVAL = 30 * 60 * 1000;
  private syncInterval: NodeJS.Timeout | null = null;
  private syncPromise: Promise<void> | null = null;
  private isRunning = false;

  constructor(
    private readonly tonApiClient: TonApiClient,
    private readonly graphQlClient: GetGemsGraphQlClient,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    this.logger.log('Starting initial gifts collections sync...');
    this.syncCollections().catch((error) => {
      this.logger.error(`Initial sync failed: ${error.message}`);
      this.logger.warn('Application will continue without initial gift collections data');
    });

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
      const startTime = Date.now();

      // 1. Пробуем получить коллекции из GetGems GraphQL (без ключа)
      let collections = await this.fetchViaGraphQL();

      // 2. Если GraphQL не дал результатов — используем адреса из конфига, детали из TonApi
      if (collections.length === 0) {
        collections = await this.fetchViaConfig();
      }

      if (collections.length === 0) {
        this.logger.warn(
          'No gift collections found. ' +
            'Add addresses to GIFT_COLLECTION_ADDRESSES in .env as fallback.',
        );
        return;
      }

      const cacheData: GiftCollectionCache = {
        collections,
        lastUpdated: Date.now(),
      };

      await this.redisService.set(this.REDIS_KEY, JSON.stringify(cacheData));

      for (const collection of collections) {
        const key = `gifts:collection:${collection.address}`;
        await this.redisService.set(key, JSON.stringify(collection));
      }

      const duration = Date.now() - startTime;
      this.logger.log(`Synced ${collections.length} gift collections in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Error syncing gift collections: ${error.message}`, error.stack);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Автодискавери через GetGems GraphQL (не требует API-ключа).
   * Возвращает пустой массив при любой ошибке — следующий слой подхватит.
   */
  private async fetchViaGraphQL(): Promise<GiftCollection[]> {
    try {
      this.logger.log('Trying GetGems GraphQL for collection discovery...');
      return await this.graphQlClient.getAllGiftCollections();
    } catch (error) {
      this.logger.warn(`GetGems GraphQL unavailable: ${error.message}`);
      return [];
    }
  }

  /**
   * Fallback: берём адреса из GIFT_COLLECTION_ADDRESSES, детали — из TonApi.
   */
  private async fetchViaConfig(): Promise<GiftCollection[]> {
    const raw = this.configService.get<string>('GIFT_COLLECTION_ADDRESSES', '');
    const addresses = raw
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);

    if (addresses.length === 0) {
      return [];
    }

    this.logger.log(
      `GetGems GraphQL returned nothing; fetching ${addresses.length} collections from TonApi (config fallback)`,
    );

    const collections: GiftCollection[] = [];

    for (const address of addresses) {
      try {
        const info = await this.tonApiClient.getCollectionInfo(address);
        if (!info) {
          this.logger.warn(`Collection ${address} not found in TonApi, skipping`);
          continue;
        }

        const preview96 =
          info.previews?.find((p) => p.resolution === '100x100') ?? info.previews?.[0];
        const preview352 =
          info.previews?.find(
            (p) => p.resolution === '500x500' || p.resolution === '352x352',
          ) ?? info.previews?.[info.previews.length - 1];

        collections.push({
          address: info.address,
          ownerAddress: info.owner?.address ?? '',
          name: info.metadata?.name ?? '',
          description: info.metadata?.description ?? '',
          image: (info.metadata?.image as string) ?? preview96?.url ?? '',
          imageSizes: {
            ...(preview96 ? { 96: preview96.url } : {}),
            ...(preview352 ? { 352: preview352.url } : {}),
          },
        });

        await new Promise((r) => setTimeout(r, 200));
      } catch (error) {
        this.logger.error(`Error fetching collection ${address}: ${error.message}`);
      }
    }

    return collections;
  }

  async getAllCollections(): Promise<GiftCollection[]> {
    try {
      let cached = await this.redisService.get(this.REDIS_KEY);

      if (!cached) {
        this.logger.warn('No cached collections found, triggering sync...');
        await this.syncCollections();
        cached = await this.redisService.get(this.REDIS_KEY);
      }

      if (!cached) return [];

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
      if (!cached) return null;
      return JSON.parse(cached);
    } catch (error) {
      this.logger.error(`Error getting collection ${address} from cache: ${error.message}`);
      return null;
    }
  }

  async getCacheInfo(): Promise<{ collectionCount: number; lastUpdated: Date | null }> {
    try {
      const cached = await this.redisService.get(this.REDIS_KEY);
      if (!cached) return { collectionCount: 0, lastUpdated: null };
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
