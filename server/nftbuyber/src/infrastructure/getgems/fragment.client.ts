import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface GiftTypeInfo {
  slug: string;
  nftAddress: string;
}

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,*/*',
  'Accept-Language': 'en-US,en;q=0.9',
};

@Injectable()
export class FragmentClient {
  private readonly logger = new Logger(FragmentClient.name);

  /**
   * Парсит fragment.com/gifts → уникальные типы подарков.
   * Возвращает пару: slug (тип) + адрес одного NFT этого типа.
   * Вызывающий резолвит NFT-адрес → адрес коллекции через TonApi.
   */
  async getGiftTypeNftAddresses(): Promise<GiftTypeInfo[]> {
    const html = await this.fetchPage('https://fragment.com/gifts');

    // /gift/plushpepe-100, /gift/lootbag-11217 …
    const allLinks = [...html.matchAll(/\/gift\/([a-zA-Z]+)-(\d+)/g)];

    // по одному примеру на каждый slug
    const slugToExample = new Map<string, string>();
    for (const [, slug, number] of allLinks) {
      if (!slugToExample.has(slug)) {
        slugToExample.set(slug, `${slug}-${number}`);
      }
    }

    if (slugToExample.size === 0) {
      this.logger.warn('Fragment: no gift type links found on /gifts page');
      return [];
    }

    this.logger.log(
      `Fragment: found ${slugToExample.size} gift types: ${[...slugToExample.keys()].join(', ')}`,
    );

    const results: GiftTypeInfo[] = [];

    for (const [slug, example] of slugToExample) {
      try {
        const nftAddress = await this.extractNftAddress(example);
        if (nftAddress) {
          results.push({ slug, nftAddress });
          this.logger.debug(`Fragment: ${slug} → NFT ${nftAddress}`);
        } else {
          this.logger.warn(`Fragment: no NFT address found for ${slug}`);
        }
        await new Promise((r) => setTimeout(r, 500));
      } catch (error) {
        this.logger.warn(`Fragment: failed to resolve ${slug}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * На странице /gift/{slug}-{n} самый часто встречающийся EQ…-адрес — это сам NFT.
   */
  private async extractNftAddress(slugWithNumber: string): Promise<string | null> {
    const html = await this.fetchPage(`https://fragment.com/gift/${slugWithNumber}`);

    const addresses = [...html.matchAll(/EQ[A-Za-z0-9_-]{46}/g)].map((m) => m[0]);
    if (addresses.length === 0) return null;

    const freq = new Map<string, number>();
    for (const addr of addresses) freq.set(addr, (freq.get(addr) ?? 0) + 1);

    return [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }

  private async fetchPage(url: string): Promise<string> {
    const { data } = await axios.get<string>(url, {
      headers: HEADERS,
      timeout: 20000,
      responseType: 'text',
    });
    return data;
  }
}
