import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { GiftCollection } from './interfaces/getgems-response.interface';

/**
 * Получает список коллекций Telegram-подарков с Fragment.com (без ключей).
 * Два метода: JSON API (пагинированный список аукционов) и парсинг HTML страницы.
 */
@Injectable()
export class FragmentClient {
  private readonly logger = new Logger(FragmentClient.name);
  private readonly api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: 'https://fragment.com',
      timeout: 20000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/json,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: 'https://fragment.com/',
      },
    });
  }

  async getAllGiftCollections(): Promise<GiftCollection[]> {
    // Метод 1: JSON API Fragment
    try {
      const apiResult = await this.fetchViaJsonApi();
      if (apiResult.length > 0) {
        this.logger.log(`Fragment JSON API: found ${apiResult.length} gift collections`);
        return apiResult;
      }
    } catch (error) {
      this.logger.debug(`Fragment JSON API failed: ${error.message}`);
    }

    // Метод 2: Парсинг HTML страницы fragment.com/gifts
    try {
      const htmlResult = await this.fetchViaHtmlPage();
      if (htmlResult.length > 0) {
        this.logger.log(`Fragment HTML parsing: found ${htmlResult.length} gift collections`);
        return htmlResult;
      }
    } catch (error) {
      this.logger.debug(`Fragment HTML parsing failed: ${error.message}`);
    }

    this.logger.warn('Fragment: all methods returned 0 collections');
    return [];
  }

  // ─── Метод 1: JSON API ────────────────────────────────────────────────────

  private async fetchViaJsonApi(): Promise<GiftCollection[]> {
    const collectionMap = new Map<string, GiftCollection>();
    const pageSize = 100;
    const maxTotal = 5000;
    let offset = 0;

    while (offset < maxTotal) {
      const data = await this.fetchAuctionPage(offset, pageSize);
      if (!data) break;

      const items: any[] =
        data.items ??
        data.auctions ??
        data.gifts ??
        data.results ??
        [];

      if (items.length === 0) break;

      for (const item of items) {
        this.extractCollectionFromItem(item, collectionMap);
      }

      if (items.length < pageSize) break;
      offset += pageSize;
      await new Promise((r) => setTimeout(r, 300));
    }

    return Array.from(collectionMap.values());
  }

  private async fetchAuctionPage(offset: number, limit: number): Promise<any> {
    // Fragment API endpoint — несколько вариантов метода
    const methodCandidates = [
      { method: 'searchAuctions', extra: { type: 'gift', filter: 'all' } },
      { method: 'getAuctions',    extra: { type: 'nft', filter: 'gift' } },
      { method: 'searchGifts',    extra: {} },
    ];

    for (const { method, extra } of methodCandidates) {
      try {
        const params: Record<string, string> = {
          hash: '',
          method,
          offset: String(offset),
          limit: String(limit),
          ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, String(v)])),
        };

        const { data } = await this.api.get('/api', {
          params,
          headers: { Accept: 'application/json' },
        });

        if (data?.ok === true || data?.items || data?.auctions || data?.gifts) {
          return data;
        }
      } catch {
        // пробуем следующий вариант
      }
    }

    return null;
  }

  private extractCollectionFromItem(
    item: any,
    map: Map<string, GiftCollection>,
  ): void {
    const addr =
      item?.collection?.address ??
      item?.collectionAddress ??
      item?.nft?.collection?.address;

    if (!addr) return;
    if (map.has(addr)) return;

    map.set(addr, {
      address: addr,
      ownerAddress: item?.collection?.owner ?? item?.ownerAddress ?? '',
      name: item?.collection?.name ?? item?.collectionName ?? item?.name ?? '',
      description: item?.collection?.description ?? '',
      image:
        item?.collection?.image ??
        item?.collection?.thumbnailUrl ??
        item?.imageUrl ??
        '',
      imageSizes: {},
    });
  }

  // ─── Метод 2: HTML-парсинг ────────────────────────────────────────────────

  private async fetchViaHtmlPage(): Promise<GiftCollection[]> {
    const { data: html } = await this.api.get<string>('/gifts', {
      headers: { Accept: 'text/html' },
      responseType: 'text',
    });

    // Вариант A: Next.js __NEXT_DATA__
    const nextDataMatch = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/.exec(
      html,
    );
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        const collections = this.extractFromNextData(nextData);
        if (collections.length > 0) return collections;
      } catch {
        // continue to next variant
      }
    }

    // Вариант B: window.__INITIAL_STATE__ / window.__APP_STATE__
    for (const pattern of [
      /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\})(?:;|\s*<\/script>)/,
      /window\.__APP_STATE__\s*=\s*(\{[\s\S]*?\})(?:;|\s*<\/script>)/,
      /window\.__DATA__\s*=\s*(\{[\s\S]*?\})(?:;|\s*<\/script>)/,
    ]) {
      const match = pattern.exec(html);
      if (match) {
        try {
          const state = JSON.parse(match[1]);
          const collections = this.extractFromGenericState(state);
          if (collections.length > 0) return collections;
        } catch {
          // continue
        }
      }
    }

    // Вариант C: встроенный JSON в <script type="application/json">
    const scriptMatches = html.matchAll(/<script type="application\/json"[^>]*>([\s\S]*?)<\/script>/g);
    for (const m of scriptMatches) {
      try {
        const json = JSON.parse(m[1]);
        const collections = this.extractFromGenericState(json);
        if (collections.length > 0) return collections;
      } catch {
        // continue
      }
    }

    return [];
  }

  private extractFromNextData(nextData: any): GiftCollection[] {
    const map = new Map<string, GiftCollection>();

    // Ищем в pageProps на любую глубину до 3 уровней
    const props = nextData?.props?.pageProps ?? {};
    const candidates: any[] = [
      props?.gifts,
      props?.giftTypes,
      props?.items,
      props?.collections,
      props?.data?.gifts,
      props?.data?.items,
    ];

    for (const list of candidates) {
      if (!Array.isArray(list)) continue;
      for (const item of list) {
        this.extractCollectionFromItem(item, map);
        // Иногда item сам является коллекцией
        if (item?.address && item?.name) {
          map.set(item.address, {
            address: item.address,
            ownerAddress: item.ownerAddress ?? item.owner?.address ?? '',
            name: item.name ?? '',
            description: item.description ?? '',
            image: item.image ?? item.imageUrl ?? '',
            imageSizes: {},
          });
        }
      }
    }

    return Array.from(map.values());
  }

  private extractFromGenericState(state: any): GiftCollection[] {
    return this.extractFromNextData({ props: { pageProps: state } });
  }
}
