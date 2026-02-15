import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Address, Cell } from 'ton-core';
import axios, { AxiosInstance } from 'axios';
import { TonNftData, ParsedContentUrl } from '../interfaces/ton-nft-data.interface';

@Injectable()
export class TonBlockchainAdapter {
  private readonly logger = new Logger(TonBlockchainAdapter.name);
  private readonly api: AxiosInstance;
  private readonly tonApiUrl: string;
  private readonly apiKey: string | undefined;
  // Альтернативные API endpoints для TON
  private readonly alternativeApis = [
    'https://testnet.toncenter.com/api/v3',
    'https://tonapi.io/v3',
  ];

  constructor(private readonly configService: ConfigService) {
    // Используем v3 API по умолчанию
    this.tonApiUrl = this.configService.get<string>('TON_API_URL') || 'https://toncenter.com/api/v3';
    this.apiKey = this.configService.get<string>('TON_API_KEY');
    
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    
    // Если есть API ключ, добавляем его
    if (this.apiKey) {
      this.logger.debug('TON API key loaded');
      headers['X-API-Key'] = this.apiKey;
    } else {
      this.logger.warn('TON API key not found in environment variables');
    }

    this.logger.debug(`Using TON API URL: ${this.tonApiUrl}`);

    this.api = axios.create({
      baseURL: this.tonApiUrl,
      timeout: 15000,
      headers,
    });
  }

  async getNftData(nftAddress: string): Promise<TonNftData | null> {
    try {
      const address = Address.parse(nftAddress);
      
      // Используем TON Center API v3 endpoint /nft/items
      const params: Record<string, any> = {
        address: nftAddress,
        include_on_sale: false,
        limit: 1,
        offset: 0,
      };
      
      // Добавляем API ключ в параметры, если есть
      if (this.apiKey) {
        params.api_key = this.apiKey;
      }
      
      // Формируем полный URL для запроса
      const queryString = new URLSearchParams({
        address: nftAddress,
        include_on_sale: 'false',
        limit: '1',
        offset: '0',
      }).toString();
      
      const fullUrl = `${this.tonApiUrl}/nft/items?${queryString}`;
      this.logger.debug(`TON API request: GET ${fullUrl}`);
      
      // Используем прямой axios запрос с полным URL
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      
      if (this.apiKey) {
        headers['X-API-Key'] = this.apiKey;
      }
      
      const response = await axios.get(fullUrl, {
        headers,
        timeout: 15000,
      });

      console.log(response.data);

      if (!response.data || !response.data.nft_items || response.data.nft_items.length === 0) {
        this.logger.warn(`No NFT items found for address ${nftAddress}`);
        return null;
      }

      const nftItem = response.data.nft_items[0];

      // Парсим данные из ответа API v3
      const init = nftItem.init === true;
      const index = BigInt(nftItem.index || '0');
      
      let collectionAddress: Address | null = null;
      if (nftItem.collection_address) {
        try {
          // Адрес может быть в формате "0:..." - преобразуем в user_friendly если есть
          const collectionRaw = nftItem.collection_address;
          const collectionEntry = response.data.address_book?.[collectionRaw];
          if (collectionEntry?.user_friendly) {
            collectionAddress = Address.parse(collectionEntry.user_friendly);
          } else if (collectionRaw) {
            // Если нет в address_book, пробуем найти через другие ключи
            // Или пробуем распарсить как user_friendly формат напрямую
            try {
              // Пробуем стандартный парсинг
              collectionAddress = Address.parse(collectionRaw);
            } catch (parseError) {
              this.logger.debug(`Failed to parse collection address ${collectionRaw} directly: ${parseError.message}`);
              // Оставляем null - адрес не удалось распарсить
            }
          }
        } catch (e) {
          this.logger.warn(`Failed to parse collection address: ${e.message}`);
        }
      }
      
      let ownerAddress: Address | null = null;
      if (nftItem.owner_address) {
        try {
          const ownerRaw = nftItem.owner_address;
          const ownerEntry = response.data.address_book?.[ownerRaw];
          if (ownerEntry?.user_friendly) {
            ownerAddress = Address.parse(ownerEntry.user_friendly);
          } else if (ownerRaw) {
            // Если нет в address_book, пробуем распарсить напрямую
            try {
              ownerAddress = Address.parse(ownerRaw);
            } catch (parseError) {
              this.logger.debug(`Failed to parse owner address ${ownerRaw} directly: ${parseError.message}`);
              // Оставляем null - адрес не удалось распарсить
            }
          }
        } catch (e) {
          this.logger.warn(`Failed to parse owner address: ${e.message}`);
        }
      }

      // Парсим content URI из ответа API v3
      let individualContent: Cell | null = null;
      const contentUri = nftItem.content?.uri || null;
      
      if (contentUri) {
        // Сохраняем URI напрямую для использования в parseIndividualContent
        // Также пробуем создать Cell, если это необходимо для совместимости
        try {
          individualContent = Cell.fromBase64('te6cckEBAQEAAgAAAA=='); // Пустая ячейка как placeholder
        } catch (e) {
          this.logger.debug(`Failed to create placeholder cell: ${e.message}`);
        }
      }

      return {
        init,
        index,
        collection: collectionAddress,
        owner: ownerAddress,
        individualContent,
        contentUri: contentUri || undefined,
      };
    } catch (error) {
      this.logger.warn(`Failed to fetch TON blockchain data for NFT ${nftAddress}: ${error.message}`);
      if (error.response) {
        this.logger.debug(`TON API response status: ${error.response.status}, data: ${JSON.stringify(error.response.data)}`);
      }
      return null;
    }
  }

  parseIndividualContent(cell: Cell | null, contentUri?: string): ParsedContentUrl | null {
    // Если есть URI из API v3, используем его напрямую
    if (contentUri) {
      return this.parseContentUrl(contentUri);
    }

    // Если нет URI, но есть Cell, пробуем распарсить Cell
    if (!cell) {
      return null;
    }

    try {
      const slice = cell.beginParse();
      
      // Проверяем формат: может быть ссылка напрямую, или словарь, или offchain content
      // Часто формат: offchain flag (0x01) + data
      try {
        const firstByte = slice.loadUint(8);
        
        if (firstByte === 0x01) {
          // Offchain content
          if (slice.remainingRefs > 0) {
            const ref = slice.loadRef();
            const data = ref.beginParse().loadStringTail();
            return this.parseContentUrl(data);
          }
        } else if (firstByte === 0x00) {
          // Onchain content, может быть словарь или ссылка
          if (slice.remainingRefs > 0) {
            const ref = slice.loadRef();
            const refSlice = ref.beginParse();
            const data = refSlice.loadStringTail();
            return this.parseContentUrl(data);
          }
        }
      } catch (e) {
        // Если не удалось прочитать как offchain/onchain, пробуем другие варианты
        this.logger.debug(`Standard parsing failed, trying alternative methods`);
      }

      // Пробуем прочитать как строку напрямую
      try {
        const newSlice = cell.beginParse();
        const data = newSlice.loadStringTail();
        return this.parseContentUrl(data);
      } catch (e) {
        // Если не строка, пробуем найти ссылку в refs
        if (cell.refs.length > 0) {
          for (const ref of cell.refs) {
            try {
              const refSlice = ref.beginParse();
              const data = refSlice.loadStringTail();
              return this.parseContentUrl(data);
            } catch (e2) {
              // Пробуем следующий ref
              continue;
            }
          }
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to parse individual content: ${error.message}`);
    }

    return null;
  }

  private parseContentUrl(data: string): ParsedContentUrl {
    const trimmed = data.trim();
    
    if (trimmed.startsWith('ipfs://')) {
      return {
        url: trimmed,
        type: 'ipfs',
      };
    } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return {
        url: trimmed,
        type: 'https',
      };
    }

    return {
      url: trimmed,
      type: 'unknown',
    };
  }
}


