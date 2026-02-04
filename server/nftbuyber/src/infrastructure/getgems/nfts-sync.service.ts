import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { Address } from '@ton/ton';
import { GetGemsApiClient } from './getgems-api.client';
import { RedisService } from '../redis/redis.service';
import { GiftsSyncService } from './gifts-sync.service';
import { NftOnSaleData, NftOnSale, GetGemsNftListing } from './interfaces/getgems-response.interface';
import { TonApiClient } from '../tonapi/tonapi.client';
import { NftPurchaseService } from '../../nft/services/nft-purchase.service';

@Injectable()
export class NftsSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NftsSyncService.name);
  private readonly SYNC_INTERVAL = 10 * 60 * 1000; // 10 минут
  private readonly ZSET_KEY = 'gifts:nfts:by-price'; // Z-SET для сортировки по цене
  private readonly NFTS_KEY_PREFIX = 'gifts:nft:'; // Префикс для key-value хранения
  private syncInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    private readonly getGemsClient: GetGemsApiClient,
    private readonly redisService: RedisService,
    private readonly giftsSyncService: GiftsSyncService,
    private readonly tonApiClient: TonApiClient,
    @Inject(forwardRef(() => NftPurchaseService))
    private readonly nftPurchaseService: NftPurchaseService,
  ) {}

  async onModuleInit() {
    // Запускаем первую синхронизацию NFT после старта (не блокируем старт)
    this.logger.log('Starting initial NFTs sync...');
    this.syncAllNfts().catch(error => {
      this.logger.error(`Initial NFTs sync failed: ${error.message}`);
      this.logger.warn('Application will continue without initial NFT data');
    });

    // Устанавливаем интервал для автоматической синхронизации каждые 10 минут
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

      // Получаем все коллекции
      const collections = await this.giftsSyncService.getAllCollections();
      
      if (collections.length === 0) {
        this.logger.warn('No collections found, skipping NFTs sync');
        return;
      }

      this.logger.log(`Syncing NFTs for ${collections.length} collections...`);

      let totalNfts = 0;
      let successfulCollections = 0;
      let failedCollections = 0;

      // Опрашиваем каждую коллекцию
      for (const collection of collections) {
        try {
          const nfts = await this.syncCollectionNfts(collection.address, collection.name);
          totalNfts += nfts;
          successfulCollections++;
          
          // Небольшая задержка между запросами
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          failedCollections++;
          this.logger.error(`Failed to sync NFTs for collection ${collection.address}: ${error.message}`);
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `NFTs sync completed: ${totalNfts} NFTs from ${successfulCollections}/${collections.length} collections in ${duration}ms (${failedCollections} failed)`
      );
    } catch (error) {
      this.logger.error(`Error syncing NFTs: ${error.message}`, error.stack);
    } finally {
      this.isRunning = false;
    }
  }

  private async syncCollectionNfts(collectionAddress: string, collectionName: string): Promise<number> {
    try {
      const response = await this.getGemsClient.getNftsOnSale(collectionAddress);


      if (!response.success || !response.response.items) {
        return 0;
      }

      const nfts = response.response.items;
      
      let saved = 0;
      for (const nft of nfts) {
        const saleAddress = nft.sale?.contractAddress;
        if (!saleAddress) {
          this.logger.debug(`Skipping NFT ${nft.address}: no sale contract address`);
          continue;
        }
        try {
          const isGetGemsV4 = await this.nftPurchaseService.checkNftContractType(Address.parse(saleAddress));
          if (!isGetGemsV4) {
            this.logger.debug(`Skipping NFT ${nft.address}: not nft_sale_getgems_v4 (code hash check)`);
            continue;
          }
        } catch (e) {
          this.logger.debug(`Skipping NFT ${nft.address}: checkNftContractType failed`);
          continue;
        }
        await this.saveNftToRedis(nft, collectionName);
        saved++;
      }

      this.logger.debug(`Synced ${saved}/${nfts.length} getgems_v4 NFTs for collection ${collectionAddress}`);
      return saved;
    } catch (error) {
      throw error;
    }
  }

  private async saveNftToRedis(nft: NftOnSale, collectionName: string): Promise<void> {
    try {
      const nftAddress = nft.address;
      const fullPriceInNano = nft.sale?.fullPrice || '0';
      const priceInTon = Number(fullPriceInNano) / 1_000_000_000;

      // Формируем данные для хранения
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
      };

      // 1. Добавляем в Z-SET (sorted set) для сортировки по цене
      // Score = цена в TON, Member = адрес NFT
      await this.redisService.zadd(this.ZSET_KEY, priceInTon, nftAddress);

      // 2. Сохраняем полные данные в key-value
      const nftKey = `${this.NFTS_KEY_PREFIX}${nftAddress}`;
      await this.redisService.set(nftKey, JSON.stringify(nftData));

    } catch (error) {
      this.logger.error(`Error saving NFT ${nft.address} to Redis: ${error.message}`);
    }
  }

  /**
   * Сохраняет листинг GetGems v4 (из TonApi) в Redis.
   * Обрабатываем только контракты nft_sale_getgems_v4.
   */
  private async saveGetGemsListingToRedis(listing: GetGemsNftListing): Promise<void> {
    try {
      const priceInTon = Number(listing.price.amount) / 1_000_000_000;
      await this.redisService.zadd(this.ZSET_KEY, priceInTon, listing.nftAddress);
      const nftKey = `${this.NFTS_KEY_PREFIX}${listing.nftAddress}`;
      const stored = { ...listing, lastUpdated: listing.lastUpdated.toISOString() };
      await this.redisService.set(nftKey, JSON.stringify(stored));
    } catch (error) {
      this.logger.error(`Error saving GetGems listing ${listing.nftAddress}: ${error.message}`);
    }
  }

  /**
   * Обновление одного NFT из TonApi: GET /v2/nfts/{address}.
   * Сохраняет только если sale — nft_sale_getgems_v4.
   */
  async refreshNftFromTonApi(nftAddress: string): Promise<GetGemsNftListing | null> {
    try {
      const item = await this.tonApiClient.getNftByAddress(nftAddress);
      this.logger.debug(`TonApi item: ${JSON.stringify(item)}`);
      
      
      return null;
    } catch (error: any) {
      this.logger.warn(`Refresh NFT from TonApi ${nftAddress}: ${error.message}`);
      return null;
    }
  }

  /**
   * Синхронизация из TonApi: для каждого аккаунта получаем NFT,
   * фильтруем только nft_sale_getgems_v4 (sale.marketplace/getgems или sale.address 0:210...),
   * сохраняем как GetGemsNftListing.
   */
  async syncFromTonApi(accountAddresses: string[]): Promise<{ total: number; saved: number }> {
    let total = 0;
    let saved = 0;
    for (const accountAddress of accountAddresses) {
      try {
        const items = await this.tonApiClient.getAccountNfts(accountAddress);
        total += items.length;
        
        await new Promise((r) => setTimeout(r, 300));
      } catch (error: any) {
        this.logger.warn(`TonApi sync for account ${accountAddress}: ${error.message}`);
      }
    }
    return { total, saved };
  }

  // Публичные методы для получения NFT из Redis

  async getNftsByPriceRange(minPrice: number, maxPrice: number): Promise<NftOnSaleData[]> {
    try {
      // Получаем адреса NFT в диапазоне цен из Z-SET
      const nftAddresses = await this.redisService.zrangeByScore(
        this.ZSET_KEY,
        minPrice,
        maxPrice
      );

      // Получаем полные данные для каждого NFT
      const nfts: NftOnSaleData[] = [];
      for (const address of nftAddresses) {
        const nftData = await this.getNftByAddress(address);
        if (nftData) {
          nfts.push(nftData);
        }
      }

      return nfts;
    } catch (error) {
      this.logger.error(`Error getting NFTs by price range: ${error.message}`);
      return [];
    }
  }

  async getNftsByExactPrice(price: number, rangePercent: number = 20): Promise<NftOnSaleData[]> {
    try {
      // Вычисляем диапазон ±20% (или другой процент)
      const range = price * (rangePercent / 100);
      const minPrice = Math.max(0, price - range); // Не меньше 0
      const maxPrice = price + range;

      this.logger.debug(`Getting NFTs with price ${price} TON (±${rangePercent}%): ${minPrice} - ${maxPrice} TON`);

      return await this.getNftsByPriceRange(minPrice, maxPrice);
    } catch (error) {
      this.logger.error(`Error getting NFTs by exact price: ${error.message}`);
      return [];
    }
  }

  async getAllNfts(): Promise<NftOnSaleData[]> {
    try {
      // Получаем все NFT из Z-SET (от 0 до +infinity)
      const nftAddresses = await this.redisService.zrangeByScore(
        this.ZSET_KEY,
        0,
        Number.POSITIVE_INFINITY
      );

      // Получаем полные данные для каждого NFT
      const nfts: NftOnSaleData[] = [];
      for (const address of nftAddresses) {
        const nftData = await this.getNftByAddress(address);
        if (nftData) {
          nfts.push(nftData);
        }
      }

      return nfts;
    } catch (error) {
      this.logger.error(`Error getting all NFTs: ${error.message}`);
      return [];
    }
  }

  async getCheapestNfts(limit: number = 10): Promise<NftOnSaleData[]> {
    try {
      // Получаем самые дешевые NFT из Z-SET
      const nftAddresses = await this.redisService.zrange(this.ZSET_KEY, 0, limit - 1);

      const nfts: NftOnSaleData[] = [];
      for (const address of nftAddresses) {
        const nftData = await this.getNftByAddress(address);
        if (nftData) {
          nfts.push(nftData);
        }
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

      if (!data) {
        return null;
      }

      const parsed = JSON.parse(data);
      if (parsed.marketplace === 'getgems_v4') {
        return this.getGemsListingToNftOnSaleData(parsed);
      }
      return parsed;
    } catch (error) {
      this.logger.error(`Error getting NFT by address: ${error.message}`);
      return null;
    }
  }

  private getGemsListingToNftOnSaleData(listing: GetGemsNftListing & { lastUpdated?: string }): NftOnSaleData {
    const priceAmount = listing.price?.amount ?? '0';
    const priceInTon = Number(priceAmount) / 1_000_000_000;
    return {
      nftAddress: listing.nftAddress,
      collectionAddress: listing.collection?.address ?? '',
      ownerAddress: listing.ownerAddress,
      actualOwnerAddress: listing.ownerAddress,
      image: listing.metadata?.image ?? '',
      name: listing.metadata?.name ?? '',
      description: listing.metadata?.description ?? '',
      priceInTon,
      fullPrice: priceAmount,
      saleAddress: listing.saleContractAddress,
      lastUpdated: typeof listing.lastUpdated === 'string' ? new Date(listing.lastUpdated).getTime() : (listing.lastUpdated as Date)?.getTime?.() ?? Date.now(),
    };
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
      
      // Попробуем получить дату последнего обновления из любого NFT
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
