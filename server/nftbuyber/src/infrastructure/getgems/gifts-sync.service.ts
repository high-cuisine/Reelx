import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { TonApiClient } from '../tonapi/tonapi.client';
import { FragmentClient } from './fragment.client';
import { RedisService } from '../redis/redis.service';
import { GiftCollection, GiftCollectionCache } from './interfaces/getgems-response.interface';

@Injectable()
export class GiftsSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GiftsSyncService.name);
  private readonly REDIS_KEY = 'gifts:collections:all';
  private readonly SYNC_INTERVAL = 30 * 60 * 1000;
  private syncInterval: NodeJS.Timeout | null = null;
  private syncPromise: Promise<void> | null = null;

  constructor(
    private readonly fragmentClient: FragmentClient,
    private readonly tonApiClient: TonApiClient,
    private readonly redisService: RedisService,
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
    try {
      this.logger.log('Starting gifts collections synchronization via Fragment + TonApi...');
      const startTime = Date.now();

      const slugs = await this.fragmentClient.getGiftSlugs();

      if (slugs.length === 0) {
        this.logger.warn('Fragment returned no gift slugs; sync aborted');
        return;
      }

      const collections: GiftCollection[] = [];

      for (const slug of slugs) {
        try {
          const collectionAddress = await this.findCollectionBySlug(slug);

          if (!collectionAddress) {
            this.logger.warn(`Could not find collection for gift type "${slug}"`);
            continue;
          }

          const info = await this.tonApiClient.getCollectionInfo(collectionAddress);
          if (!info) {
            this.logger.warn(`Collection ${collectionAddress} not found in TonApi`);
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
            name: info.metadata?.name ?? slug,
            description: (info.metadata?.description as string) ?? '',
            image: (info.metadata?.image as string) ?? preview96?.url ?? '',
            imageSizes: {
              ...(preview96 ? { 96: preview96.url } : {}),
              ...(preview352 ? { 352: preview352.url } : {}),
            },
          });

          this.logger.debug(`Resolved "${slug}" → collection ${collectionAddress}`);
          await new Promise((r) => setTimeout(r, 1000));
        } catch (error) {
          this.logger.error(`Error resolving gift type "${slug}": ${error.message}`);
        }
      }

      if (collections.length === 0) {
        this.logger.warn('No collections resolved');
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
      this.logger.log(
        `Successfully synced ${collections.length}/${slugs.length} gift collections in ${duration}ms`,
      );
    } catch (error) {
      this.logger.error(`Error syncing gift collections: ${error.message}`, error.stack);
    }
  }

  /**
   * Ищет адрес коллекции Telegram-подарка по slug через TonAPI.
   * Верификация: у настоящей коллекции image содержит nft.fragment.com/collection/{slug}
   * Стратегия: whitelist-кандидаты проверяются первыми, max 12 кандидатов суммарно.
   */
  private async findCollectionBySlug(slug: string): Promise<string | null> {
    let candidates = await this.tonApiClient.searchAccounts(slug);
    if (candidates.length === 0) return null;

    // Whitelist-кандидаты имеют приоритет
    const whitelisted = candidates.filter((c) => c.trust === 'whitelist');
    const others = candidates.filter((c) => c.trust !== 'whitelist' && c.trust !== 'blacklist');
    candidates = [...whitelisted, ...others].slice(0, 12);

    for (const candidate of candidates) {
      try {
        const info = await this.tonApiClient.getCollectionInfo(candidate.address);
        if (!info) {
          await new Promise((r) => setTimeout(r, 400));
          continue;
        }

        const image = (info.metadata?.image as string) ?? '';
        if (image.includes(`nft.fragment.com/collection/${slug}`)) {
          this.logger.debug(`Fragment: "${slug}" → collection ${candidate.address} (${candidate.name})`);
          return candidate.address;
        }
      } catch {
        // Not a valid collection, skip
      }
      await new Promise((r) => setTimeout(r, 600));
    }

    return null;
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
