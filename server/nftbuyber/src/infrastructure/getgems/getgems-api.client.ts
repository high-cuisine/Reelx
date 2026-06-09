import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  GetGemsCollectionsResponse,
  GiftCollection,
  GetGemsNftsOnSaleResponse,
} from './interfaces/getgems-response.interface';

@Injectable()
export class GetGemsApiClient {
  private readonly logger = new Logger(GetGemsApiClient.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GETGEMS_API_KEY', '');

    if (!this.apiKey) {
      this.logger.warn('GETGEMS_API_KEY not found in environment variables');
    }

    this.axiosInstance = axios.create({
      baseURL: 'https://api.getgems.io/public-api/v1',
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      timeout: 30000,
    });
  }

  async getGiftsCollections(
    after?: string,
    limit: number = 10,
  ): Promise<GetGemsCollectionsResponse> {
    try {
      this.logger.debug(
        `Fetching gifts collections${after ? ` with after: ${after}` : ''} (limit: ${limit})`,
      );

      const response = await this.axiosInstance.get<GetGemsCollectionsResponse>(
        '/gifts/collections',
        { params: { ...(after ? { after } : {}), limit } },
      );

      return response.data;
    } catch (error) {
      if (error.response) {
        this.logger.error(
          `GetGems API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`,
        );
      } else {
        this.logger.error(`Error fetching gifts collections: ${error.message}`);
      }
      throw error;
    }
  }

  async getAllGiftsCollections(): Promise<GiftCollection[]> {
    try {
      const limit = 10;
      const maxTotal = 200;
      const all: GiftCollection[] = [];
      let after: string | undefined;

      while (all.length < maxTotal) {
        const response = await this.getGiftsCollections(after, limit);
        const items = response?.response?.items ?? [];

        if (!response.success) {
          this.logger.warn('GetGems API returned success=false while fetching collections');
          break;
        }

        if (!Array.isArray(items) || items.length === 0) {
          this.logger.log(`No more collections returned (total: ${all.length})`);
          break;
        }

        all.push(...items.slice(0, maxTotal - all.length));
        after = response.response.cursor ?? undefined;

        if (!after) {
          this.logger.log(`Cursor is null, stop paging (total: ${all.length})`);
          break;
        }
      }

      this.logger.log(`Successfully fetched ${all.length} gift collections (paged)`);
      return all;
    } catch (error) {
      this.logger.error(`Error fetching all gifts collections: ${error.message}`);
      throw error;
    }
  }

  async getNftsOnSale(collectionAddress: string): Promise<GetGemsNftsOnSaleResponse> {
    try {
      this.logger.debug(`Fetching NFTs on sale for collection: ${collectionAddress}`);

      const response = await this.axiosInstance.get<GetGemsNftsOnSaleResponse>(
        `/nfts/on-sale/${collectionAddress}`,
      );

      return response.data;
    } catch (error) {
      if (error.response) {
        this.logger.error(
          `GetGems API error for collection ${collectionAddress}: ${error.response.status} - ${JSON.stringify(error.response.data)}`,
        );
      } else {
        this.logger.error(`Error fetching NFTs on sale for ${collectionAddress}: ${error.message}`);
      }
      throw error;
    }
  }
}
