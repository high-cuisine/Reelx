import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

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
   * Парсит fragment.com/gifts → уникальные slug'и типов подарков.
   */
  async getGiftSlugs(): Promise<string[]> {
    const html = await this.fetchPage('https://fragment.com/gifts');

    const allLinks = [...html.matchAll(/\/gift\/([a-zA-Z]+)-(\d+)/g)];
    const slugs = new Set<string>();
    for (const [, slug] of allLinks) {
      slugs.add(slug);
    }

    if (slugs.size === 0) {
      this.logger.warn('Fragment: no gift type links found on /gifts page');
      return [];
    }

    this.logger.log(
      `Fragment: found ${slugs.size} gift types: ${[...slugs].join(', ')}`,
    );

    return [...slugs];
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
