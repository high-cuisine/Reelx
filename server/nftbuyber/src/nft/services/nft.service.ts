import { Injectable, Logger } from '@nestjs/common';
import { MarketplaceAdapter } from '../adapters/marketplace.adapter';
import { TonBlockchainAdapter } from '../adapters/ton-blockchain.adapter';
import { MetadataAdapter } from '../adapters/metadata.adapter';
import { CacheService } from './cache.service';
import { TonNftData } from '../interfaces/ton-nft-data.interface';
import {
  NftResponseDto,
  NftCollectionDto,
  NftAttributeDto,
  NftMediaDto,
  NftSourcesDto,
} from '../dto/nft-response.dto';
import { GetGiftsByPriceResponse, GiftItem } from '../dto/get-gifts-by-price.dto';
import { GiftsSyncService } from '../../infrastructure/getgems/gifts-sync.service';
import { NftsSyncService } from '../../infrastructure/getgems/nfts-sync.service';

@Injectable()
export class NftService {
  private readonly logger = new Logger(NftService.name);

  constructor(
    private readonly marketplaceAdapter: MarketplaceAdapter,
    private readonly tonBlockchainAdapter: TonBlockchainAdapter,
    private readonly metadataAdapter: MetadataAdapter,
    private readonly cacheService: CacheService,
    private readonly giftsSyncService: GiftsSyncService,
    private readonly nftsSyncService: NftsSyncService,
  ) {
    // Периодическая очистка кеша каждые 10 минут
    setInterval(() => {
      this.cacheService.cleanup();
    }, 10 * 60 * 1000);
  }

  async getNftData(nftAddress: string): Promise<NftResponseDto> {
    // Проверяем кеш
    const cached = this.cacheService.get(nftAddress);
    if (cached) {
      this.logger.debug(`Returning cached data for NFT ${nftAddress}`);
      return cached;
    }

    // Инициализируем источники данных
    const sources: NftSourcesDto = {
      marketplace: false,
      onchain: false,
      metadata: false,
    };

    let name = '';
    let collection: NftCollectionDto = { address: '', name: '' };
    let status: 'for_sale' | 'not_for_sale' = 'not_for_sale';
    let price = '0';
    let attributes: NftAttributeDto[] = [];
    let imageUrl = '';
    let rawImageUrl = '';
    let metadata: any = {};

    // Выполняем Marketplace и TON API запросы параллельно для ускорения
    const [marketplaceResult, tonResult] = await Promise.allSettled([
      this.marketplaceAdapter.getNftData(nftAddress),
      this.tonBlockchainAdapter.getNftData(nftAddress),
    ]);

    // Обрабатываем результат Marketplace API
    if (marketplaceResult.status === 'fulfilled' && marketplaceResult.value) {
      const marketplaceData = marketplaceResult.value;
      sources.marketplace = true;
      
      // Логируем данные marketplace для отладки
      this.logger.debug(`Marketplace data received: ${JSON.stringify(marketplaceData)}`);
      
      if (marketplaceData.name) {
        name = marketplaceData.name;
      }
      
      if (marketplaceData.collection) {
        collection = {
          address: marketplaceData.collection.address,
          name: marketplaceData.collection.name || '',
        };
      } else if (marketplaceData.collection_address) {
        // Если collection_address есть напрямую, используем его
        collection.address = marketplaceData.collection_address;
      }
      
      if (marketplaceData.status) {
        status = marketplaceData.status;
      }
      
      // Пробуем получить цену из разных полей
      // В первую очередь проверяем status_details.price (основной формат Marketplace API)
      if (marketplaceData.status_details?.price) {
        price = String(marketplaceData.status_details.price);
      } else if (marketplaceData.price) {
        price = String(marketplaceData.price);
      } else if ((marketplaceData as any).price_in_nano) {
        price = String((marketplaceData as any).price_in_nano);
      } else if ((marketplaceData as any).amount) {
        price = String((marketplaceData as any).amount);
      } else if ((marketplaceData as any).ton_price) {
        price = String((marketplaceData as any).ton_price);
      } else {
        this.logger.warn(`Price not found in marketplace data for ${nftAddress}. Available fields: ${Object.keys(marketplaceData).join(', ')}`);
      }
      
      if (marketplaceData.attributes) {
        attributes = marketplaceData.attributes.map(attr => ({
          trait_type: attr.trait_type,
          value: attr.value,
        }));
      }
    } else if (marketplaceResult.status === 'rejected') {
      this.logger.warn(`Marketplace data unavailable for ${nftAddress}: ${marketplaceResult.reason?.message || marketplaceResult.reason}`);
    }

    // Обрабатываем результат TON API
    let tonData: TonNftData | null = null;
    if (tonResult.status === 'fulfilled' && tonResult.value) {
      tonData = tonResult.value;
    } else if (tonResult.status === 'rejected') {
      this.logger.warn(`Onchain data unavailable for ${nftAddress}: ${tonResult.reason?.message || tonResult.reason}`);
    }

    if (tonData && tonData.init) {
      sources.onchain = true;
      
      // Если нет коллекции из marketplace, пробуем взять из ончейн
      if (!collection.address && tonData.collection) {
        collection.address = tonData.collection.toString();
      }
      
      // Шаг 3: Распарсить individual_content (используем URI из API v3 если есть)
      const contentUrl = this.tonBlockchainAdapter.parseIndividualContent(
        tonData.individualContent,
        tonData.contentUri
      );
      
      if (contentUrl && (contentUrl.type === 'ipfs' || contentUrl.type === 'https')) {
        rawImageUrl = contentUrl.url;
        
        // Шаг 4: Загрузить metadata JSON
        try {
          const fetchedMetadata = await this.metadataAdapter.fetchMetadata(contentUrl.url);
          
          if (fetchedMetadata) {
            sources.metadata = true;
            metadata = fetchedMetadata;
            
            // Если нет имени из marketplace, пробуем взять из metadata
            if (!name && fetchedMetadata.name) {
              name = fetchedMetadata.name;
            }
            
            // Если нет атрибутов из marketplace, пробуем взять из metadata
            if (attributes.length === 0 && fetchedMetadata.attributes) {
              attributes = fetchedMetadata.attributes.map(attr => ({
                trait_type: attr.trait_type || '',
                value: attr.value || '',
              }));
            }
            
            // Шаг 5: Извлечь изображение
            const extractedImage = this.metadataAdapter.extractImageUrl(fetchedMetadata);
            if (extractedImage) {
              imageUrl = this.metadataAdapter.normalizeImageUrl(extractedImage);
              rawImageUrl = extractedImage;
            }
          }
        } catch (error) {
          this.logger.warn(`Metadata unavailable for ${nftAddress}: ${error.message}`);
        }
      }
    }

    // Если имени все еще нет, используем адрес
    if (!name) {
      name = nftAddress;
    }

    // Lottie из TonCenter metadata (pre-indexed token_info[0].extra)
    const lottieUrl = tonData?.tonCenterExtra?.lottie;
    if (lottieUrl && typeof metadata === 'object') {
      metadata.lottie = lottieUrl;
    }

    // Формируем ответ
    const response: NftResponseDto = {
      address: nftAddress,
      name,
      collection,
      status,
      price,
      attributes,
      media: {
        image: imageUrl || '',
        raw_image: rawImageUrl || '',
        ...(lottieUrl && { lottie: lottieUrl }),
      },
      metadata,
      sources,
    };

    // Кешируем результат (не кешируем ошибки - только если есть хотя бы один источник)
    if (sources.marketplace || sources.onchain || sources.metadata) {
      this.cacheService.set(nftAddress, response);
    }

    return response;
  }

  async getGiftsByPrice(amount?: number): Promise<GetGiftsByPriceResponse> {
    try {
      // Получаем все коллекции для маппинга имен
      const collections = await this.giftsSyncService.getAllCollections();
      const collectionsMap = new Map(
        collections.map(c => [c.address, c.name])
      );

      let nftsOnSale: any[];
      
      if (amount === undefined || amount === null) {
        // Если цена не передана - возвращаем все NFT
        this.logger.log('Fetching all gifts (no price filter)');
        nftsOnSale = await this.nftsSyncService.getAllNfts();
      } else {
        // Если цена передана - возвращаем NFT с диапазоном ±20%
        this.logger.log(`Fetching gifts with price: ${amount} TON (±20%)`);
        nftsOnSale = await this.nftsSyncService.getNftsByExactPrice(amount, 20);
      }

      if (nftsOnSale.length === 0) {
        this.logger.warn(`No NFTs found${amount ? ` with price ${amount} TON` : ''}`);
        return {
          success: true,
          amount: amount || 0,
          gifts: [],
          count: 0,
        };
      }

      // Преобразуем NFT в формат GiftItem
      const gifts: GiftItem[] = nftsOnSale.map(nft => {
        const collectionName = collectionsMap.get(nft.collectionAddress) || 'Unknown Collection';
        
        return {
          address: nft.nftAddress,
          name: nft.name,
          collection: {
            address: nft.collectionAddress,
            name: collectionName,
          },
          price: nft.fullPrice, // в nanoTON
          image: nft.image,
          ownerAddress: nft.ownerAddress,
          actualOwnerAddress: nft.actualOwnerAddress,
          ...(nft.lottie ? { lottie: nft.lottie } : {}),
        };
      });

      this.logger.log(`Found ${gifts.length} NFTs${amount ? ` with price ${amount} TON (±20%)` : ' (all)'}`);
      
      return {
        success: true,
        amount: amount || 0,
        gifts,
        count: gifts.length,
      };
    } catch (error) {
      this.logger.error(`Error fetching gifts by price: ${error.message}`);
      throw error;
    }
  }
}

