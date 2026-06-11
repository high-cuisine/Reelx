import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,*/*',
  'Accept-Language': 'en-US,en;q=0.9',
};

// Все известные Telegram-подарки. Fragment.com/gifts показывает только активные продажи,
// поэтому держим полный список чтобы не пропускать коллекции без текущих объявлений.
const KNOWN_TELEGRAM_GIFT_SLUGS = [
  'plushpepe', 'swisswatch', 'heartlocket', 'scaredcat', 'lootbag',
  'sakuraflower', 'lowrider', 'durovscap', 'crystalball', 'diamondring',
  'eternalrose', 'hangingstar', 'kissedfrog', 'spyagaric', 'toybear',
  'trappedheart', 'voodoodoll', 'bunnymuffin', 'cookieheart', 'electricskull',
  'homemadecake', 'snowglobe',
];

@Injectable()
export class FragmentClient {
  private readonly logger = new Logger(FragmentClient.name);

  /**
   * Возвращает все slug'и типов подарков:
   * парсит fragment.com/gifts (активные продажи) + дополняет известным списком.
   */
  async getGiftSlugs(): Promise<string[]> {
    const slugs = new Set<string>(KNOWN_TELEGRAM_GIFT_SLUGS);

    try {
      const html = await this.fetchPage('https://fragment.com/gifts');
      for (const [, slug] of html.matchAll(/\/gift\/([a-zA-Z]+)-(\d+)/g)) {
        slugs.add(slug);
      }
    } catch (error: any) {
      this.logger.warn(`Fragment: could not fetch /gifts page: ${error.message}`);
    }

    this.logger.log(
      `Fragment: ${slugs.size} gift types to sync: ${[...slugs].join(', ')}`,
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
