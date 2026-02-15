import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Address } from '@ton/ton';

/** Ответ TonCenter API v3 GET /nft/items (упрощённая структура для metadata) */
interface TonCenterNftItemsResponse {
  nft_items?: Array<{ address: string }>;
  metadata?: Record<
    string,
    {
      token_info?: Array<{
        extra?: {
          lottie?: string;
          [key: string]: unknown;
        };
      }>;
    }
  >;
}

@Injectable()
export class TonCenterClient {
  private readonly logger = new Logger(TonCenterClient.name);
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>('TON_API_URL') || 'https://toncenter.com/api/v3';
    this.apiKey = this.configService.get<string>('TON_API_KEY');
  }

  /**
   * Запрашивает NFT по адресу у TonCenter (GET /nft/items?address=...)
   * и возвращает URL lottie из metadata[address].token_info[0].extra.lottie
   */
  async getNftLottie(nftAddress: string): Promise<string | undefined> {
    try {
      const userFriendly = this.toUserFriendly(nftAddress);
      const params = new URLSearchParams({
        address: userFriendly,
        include_on_sale: 'false',
        limit: '1',
        offset: '0',
      });
      if (this.apiKey) {
        params.set('api_key', this.apiKey);
      }
      const url = `${this.baseUrl}/nft/items?${params.toString()}`;
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (this.apiKey) {
        headers['X-API-Key'] = this.apiKey;
      }

      const response = await axios.get<TonCenterNftItemsResponse>(url, {
        headers,
        timeout: 15000,
      });

      const data = response.data;
      if (!data?.nft_items?.length || !data.metadata) {
        return undefined;
      }

      const nftItem = data.nft_items[0];
      const rawAddress = nftItem.address;
      const meta = data.metadata[rawAddress];
      const tokenInfo = meta?.token_info?.[0];
      const lottie = tokenInfo?.extra?.lottie;

      return typeof lottie === 'string' ? lottie : undefined;
    } catch (error: any) {
      this.logger.debug(
        `TonCenter getNftLottie ${nftAddress}: ${error?.response?.status ?? error?.message}`,
      );
      return undefined;
    }
  }

  private toUserFriendly(address: string): string {
    try {
      return Address.parse(address).toString();
    } catch {
      return address;
    }
  }
}
