import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { Address } from '@ton/ton';
import { TonApiClient } from '../tonapi/tonapi.client';
import { TonApiNftItem } from '../tonapi/tonapi-response.interface';
import { TonCenterClient } from './toncenter.client';
import { RedisService } from '../redis/redis.service';
import { GiftsSyncService } from './gifts-sync.service';
import { NftOnSale, NftOnSaleData } from './interfaces/getgems-response.interface';
import { NftPurchaseService } from '../../nft/services/nft-purchase.service';

@Injectable()
export class NftsSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NftsSyncService.name);
  private readonly SYNC_INTERVAL = 10 * 60 * 1000;
  private readonly ZSET_KEY = 'gifts:nfts:by-price';
  private readonly NFTS_KEY_PREFIX = 'gifts:nft:';
  private syncInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    private readonly tonApiClient: TonApiClient,
    private readonly tonCenterClient: TonCenterClient,
    private readonly redisService: RedisService,
    private readonly giftsSyncService: GiftsSyncService,
    @Inject(forwardRef(() => NftPurchaseService))
    private readonly nftPurchaseService: NftPurchaseService,
  ) {}

  async onModuleInit() {
    this.logger.log('Starting initial NFTs sync...');
    this.syncAllNfts().catch((error) => {
      this.logger.error(`Initial NFTs sync failed: ${error.message}`);
      this.logger.warn('Application will continue without initial NFT data');
    });

    this.syncInterval = setInterval(async () => {
      this.logger.log('Running scheduled NFTs sync...');
      await this.syncAllNfts();
    }, this.SYNC_INTERVAL);

    this.logger.log(`Scheduled NFTs sync every ${this.SYNC_INTERVAL / 60000} minutes`);
  }

  onModuleDestroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.logger.log('NFTs sync interval cleared');
    }
  }

  async syncAllNfts(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('NFTs sync already in progress, skipping...');
      return;
    }
    this.isRunning = true;

    try {
      this.logger.log('Starting NFTs synchronization...');
      const startTime = Date.now();

      const collections = await this.giftsSyncService.getAllCollections();

      if (collections.length === 0) {
        this.logger.warn('No collections found, skipping NFTs sync');
        return;
      }

      this.logger.log(`Syncing NFTs for ${collections.length} collections...`);

      let totalNfts = 0;
      let successfulCollections = 0;
      let failedCollections = 0;

      for (const collection of collections) {
        try {
          const saved = await this.syncCollectionNfts(collection.address, collection.name);
          totalNfts += saved;
          successfulCollections++;
          await new Promise((r) => setTimeout(r, 200));
        } catch (error) {
          failedCollections++;
          this.logger.error(
            `Failed to sync NFTs for collection ${collection.address}: ${error.message}`,
          );
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `NFTs sync completed: ${totalNfts} NFTs from ${successfulCollections}/${collections.length} collections in ${duration}ms (${failedCollections} failed)`,
      );
    } catch (error) {
      this.logger.error(`Error syncing NFTs: ${error.message}`, error.stack);
    } finally {
      this.isRunning = false;
    }
  }

  private mapTonApiItemToNftOnSale(item: TonApiNftItem): NftOnSale {
    const price = item.sale?.price?.value ?? item.sale?.price?.amount ?? '0';
    return {
      address: item.address,
      kind: 'nft',
      collectionAddress: item.collection?.address ?? '',
      ownerAddress: item.owner?.address ?? '',
      actualOwnerAddress: item.owner?.address ?? '',
      image: item.metadata?.image ?? item.previews?.[0]?.url ?? '',
      name: item.metadata?.name ?? '',
      description: item.metadata?.description ?? '',
      attributes: item.metadata?.attributes ?? [],
      sale: {
        type: 'fix_price',
        fullPrice: price,
        currency: 'TON',
        contractAddress: item.sale?.address ?? null,
      },
    };
  }

  private async syncCollectionNfts(
    collectionAddress: string,
    collectionName: string,
  ): Promise<number> {
    const items = await this.tonApiClient.getAllCollectionItemsOnSale(collectionAddress);

    if (items.length === 0) {
      return 0;
    }

    const canCheckContractType = this.nftPurchaseService.isClientInitialized();
    if (!canCheckContractType) {
      this.logger.debug(
        `TON client not initialized: syncing NFTs without contract type check (collection ${collectionAddress})`,
      );
    }

    let saved = 0;
    for (const item of items) {
      const saleAddress = item.sale?.address;
      if (!saleAddress) continue;

      if (canCheckContractType) {
        try {
          const isGetGemsV4 = await this.nftPurchaseService.checkNftContractType(
            Address.parse(saleAddress),
          );
          if (!isGetGemsV4) {
            this.logger.debug(
              `Skipping NFT ${item.address}: not nft_sale_getgems_v4 (code hash check)`,
            );
            continue;
          }
        } catch {
          this.logger.debug(`Skipping NFT ${item.address}: checkNftContractType failed`);
          continue;
        }
      }

      const nft = this.mapTonApiItemToNftOnSale(item);
      const lottie = await this.tonCenterClient.getNftLottie(item.address);
      await this.saveNftToRedis(nft, collectionName, lottie);
      saved++;
      await new Promise((r) => setTimeout(r, 100));
    }

    this.logger.debug(
      `Synced ${saved}/${items.length} getgems_v4 NFTs for collection ${collectionAddress}`,
    );
    return saved;
  }

  private async saveNftToRedis(
    nft: NftOnSale,
    collectionName: string,
    lottie?: string,
  ): Promise<void> {
    try {
      const nftAddress = nft.address;
      const fullPriceInNano = nft.sale?.fullPrice || '0';
      const priceInTon = Number(fullPriceInNano) / 1_000_000_000;

      const nftData: NftOnSaleData = {
        nftAddress,
        collectionAddress: nft.collectionAddress,
        ownerAddress: nft.ownerAddress,
        actualOwnerAddress: nft.actualOwnerAddress,
        image: nft.image,
        name: nft.name,
        description: nft.description || '',
        priceInTon,
        fullPrice: fullPriceInNano,
        saleAddress: nft.sale?.contractAddress || undefined,
        lastUpdated: Date.now(),
        ...(lottie ? { lottie } : {}),
      };

      await this.redisService.zadd(this.ZSET_KEY, priceInTon, nftAddress);
      const nftKey = `${this.NFTS_KEY_PREFIX}${nftAddress}`;
      await this.redisService.set(nftKey, JSON.stringify(nftData));
    } catch (error) {
      this.logger.error(`Error saving NFT ${nft.address} to Redis: ${error.message}`);
    }
  }

  async getNftsByPriceRange(minPrice: number, maxPrice: number): Promise<NftOnSaleData[]> {
    try {
      const nftAddresses = await this.redisService.zrangeByScore(
        this.ZSET_KEY,
        minPrice,
        maxPrice,
      );
      const nfts: NftOnSaleData[] = [];
      for (const address of nftAddresses) {
        const nftData = await this.getNftByAddress(address);
        if (nftData) nfts.push(nftData);
      }
      return nfts;
    } catch (error) {
      this.logger.error(`Error getting NFTs by price range: ${error.message}`);
      return [];
    }
  }

  async getNftsByExactPrice(price: number, rangePercent: number = 20): Promise<NftOnSaleData[]> {
    try {
      const range = price * (rangePercent / 100);
      const minPrice = Math.max(0, price - range);
      const maxPrice = price + range;
      this.logger.debug(
        `Getting NFTs with price ${price} TON (±${rangePercent}%): ${minPrice} - ${maxPrice} TON`,
      );
      return await this.getNftsByPriceRange(minPrice, maxPrice);
    } catch (error) {
      this.logger.error(`Error getting NFTs by exact price: ${error.message}`);
      return [];
    }
  }

  async getAllNfts(): Promise<NftOnSaleData[]> {
    try {
      const nftAddresses = await this.redisService.zrangeByScore(
        this.ZSET_KEY,
        0,
        Number.POSITIVE_INFINITY,
      );
      const nfts: NftOnSaleData[] = [];
      for (const address of nftAddresses) {
        const nftData = await this.getNftByAddress(address);
        if (nftData) nfts.push(nftData);
      }
      return nfts;
    } catch (error) {
      this.logger.error(`Error getting all NFTs: ${error.message}`);
      return [];
    }
  }

  async getCheapestNfts(limit: number = 10): Promise<NftOnSaleData[]> {
    try {
      const nftAddresses = await this.redisService.zrange(this.ZSET_KEY, 0, limit - 1);
      const nfts: NftOnSaleData[] = [];
      for (const address of nftAddresses) {
        const nftData = await this.getNftByAddress(address);
        if (nftData) nfts.push(nftData);
      }
      return nfts;
    } catch (error) {
      this.logger.error(`Error getting cheapest NFTs: ${error.message}`);
      return [];
    }
  }

  async getNftByAddress(nftAddress: string): Promise<NftOnSaleData | null> {
    try {
      const nftKey = `${this.NFTS_KEY_PREFIX}${nftAddress}`;
      const data = await this.redisService.get(nftKey);
      if (!data) return null;
      return JSON.parse(data);
    } catch (error) {
      this.logger.error(`Error getting NFT by address: ${error.message}`);
      return null;
    }
  }

  async getTotalNftsCount(): Promise<number> {
    try {
      return await this.redisService.zcard(this.ZSET_KEY);
    } catch (error) {
      this.logger.error(`Error getting total NFTs count: ${error.message}`);
      return 0;
    }
  }

  async getSyncInfo(): Promise<{ totalNfts: number; lastUpdated: Date | null }> {
    try {
      const totalNfts = await this.getTotalNftsCount();
      let lastUpdated: Date | null = null;
      const recentNfts = await this.getCheapestNfts(1);
      if (recentNfts.length > 0) {
        lastUpdated = new Date(recentNfts[0].lastUpdated);
      }
      return { totalNfts, lastUpdated };
    } catch (error) {
      this.logger.error(`Error getting sync info: ${error.message}`);
      return { totalNfts: 0, lastUpdated: null };
    }
  }
}
