import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  TonApiNftDetailsResponse,
  TonApiAccountNftsResponse,
  TonApiCollectionResponse,
  TonApiCollectionItemsResponse,
  TonApiNftItem,
} from './tonapi-response.interface';

@Injectable()
export class TonApiClient {
  private readonly logger = new Logger(TonApiClient.name);
  private readonly api: AxiosInstance;
  private readonly apiKey: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('TONAPI_IO_KEY');
    this.api = axios.create({
      baseURL: 'https://tonapi.io',
      timeout: 15000,
      headers: {
        Accept: 'application/json',
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
    });
    if (!this.apiKey) {
      this.logger.warn('TONAPI_IO_KEY not set; using public rate limits');
    }
  }

  /** GET /v2/nfts/{address} — детали NFT, включая sale. */
  async getNftByAddress(address: string): Promise<TonApiNftDetailsResponse | null> {
    try {
      const { data } = await this.api.get<TonApiNftDetailsResponse>(`/v2/nfts/${address}`);
      return data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      this.logger.warn(`TonApi getNftByAddress ${address}: ${error.response?.status ?? error.message}`);
      throw error;
    }
  }

  /** GET /v2/accounts/{address}/nfts — список NFT аккаунта. */
  async getAccountNfts(accountAddress: string): Promise<TonApiNftDetailsResponse[]> {
    try {
      const { data } = await this.api.get<TonApiAccountNftsResponse>(
        `/v2/accounts/${accountAddress}/nfts`,
      );
      const items = data?.nft_items ?? [];
      return items as TonApiNftDetailsResponse[];
    } catch (error: any) {
      this.logger.warn(
        `TonApi getAccountNfts ${accountAddress}: ${error.response?.status ?? error.message}`,
      );
      throw error;
    }
  }

  /** GET /v2/nfts/collections/{account_id} — данные о коллекции. Retry при 429. */
  async getCollectionInfo(collectionAddress: string): Promise<TonApiCollectionResponse | null> {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { data } = await this.api.get<TonApiCollectionResponse>(
          `/v2/nfts/collections/${collectionAddress}`,
        );
        return data;
      } catch (error: any) {
        const status = error.response?.status;
        if (status === 404) return null;
        if (status === 429 && attempt === 0) {
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }
        this.logger.warn(`TonApi getCollectionInfo ${collectionAddress}: ${status ?? error.message}`);
        return null;
      }
    }
    return null;
  }

  /** GET /v2/nfts/collections/{account_id}/items — страница предметов коллекции. */
  async getCollectionItems(
    collectionAddress: string,
    offset = 0,
    limit = 1000,
  ): Promise<TonApiNftItem[]> {
    try {
      const { data } = await this.api.get<TonApiCollectionItemsResponse>(
        `/v2/nfts/collections/${collectionAddress}/items`,
        { params: { limit, offset } },
      );
      return data?.nft_items ?? [];
    } catch (error: any) {
      this.logger.warn(
        `TonApi getCollectionItems ${collectionAddress}: ${error.response?.status ?? error.message}`,
      );
      return [];
    }
  }

  /** GET /v2/accounts/search?name={name} — поиск аккаунтов/коллекций по имени. */
  async searchAccounts(
    name: string,
  ): Promise<Array<{ address: string; name: string; trust: string }>> {
    try {
      const { data } = await this.api.get<{
        addresses: Array<{ address: string; name: string; trust: string }>;
      }>('/v2/accounts/search', { params: { name } });
      return data?.addresses ?? [];
    } catch (error: any) {
      this.logger.warn(`TonApi searchAccounts "${name}": ${error.response?.status ?? error.message}`);
      return [];
    }
  }

  /**
   * Перебирает все предметы коллекции и возвращает только те, у которых есть sale.address.
   * Максимум 5000 предметов на коллекцию.
   */
  async getAllCollectionItemsOnSale(collectionAddress: string): Promise<TonApiNftItem[]> {
    const onSale: TonApiNftItem[] = [];
    const pageSize = 1000;
    const maxItems = 5000;
    let offset = 0;

    while (offset < maxItems) {
      const items = await this.getCollectionItems(collectionAddress, offset, pageSize);
      if (items.length === 0) break;

      for (const item of items) {
        if (item.sale?.address) {
          onSale.push(item);
        }
      }

      if (items.length < pageSize) break;
      offset += pageSize;
      await new Promise((r) => setTimeout(r, 300));
    }

    return onSale;
  }
}
