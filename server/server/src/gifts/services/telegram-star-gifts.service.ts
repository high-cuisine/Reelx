import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { RedisService } from '../../../libs/infrustructure/redis/redis.service';
import type { WheelTelegramGiftItem } from '../interfaces/wheel-item.interface';

const GIFTS_CACHE_KEY = 'gifts:telegram_available_v1';
const GIFTS_CACHE_TTL_SECONDS = 10 * 60;

/** Ответ Bot API: Gift */
type TelegramApiGift = {
  id: string;
  star_count: number;
  sticker?: { emoji?: string; thumbnail?: { file_id?: string } };
  personal_remaining_count?: number;
};

@Injectable()
export class TelegramStarGiftsService {
  private readonly logger = new Logger(TelegramStarGiftsService.name);
  private readonly apiBase: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN', '');
    this.apiBase = token ? `https://api.telegram.org/bot${token}` : '';
  }

  private async fetchAvailableGifts(): Promise<TelegramApiGift[]> {
    if (!this.apiBase) {
      return [];
    }
    const cached = await this.redisService.get(GIFTS_CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as TelegramApiGift[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        /* cache miss shape */
      }
    }

    try {
      const { data } = await axios.post<{ ok: boolean; result?: { gifts?: TelegramApiGift[] } }>(
        `${this.apiBase}/getAvailableGifts`,
        {},
        { timeout: 20000 },
      );
      if (!data?.ok || !Array.isArray(data.result?.gifts)) {
        this.logger.warn('getAvailableGifts: empty or invalid response');
        return [];
      }
      const gifts = data.result.gifts;
      await this.redisService.set(GIFTS_CACHE_KEY, JSON.stringify(gifts), GIFTS_CACHE_TTL_SECONDS);
      return gifts;
    } catch (e) {
      this.logger.warn(`getAvailableGifts failed: ${(e as Error).message}`);
      return [];
    }
  }

  /** Все подарки с минимальной ценой в Stars (самые дешёвые в каталоге Telegram). */
  private pickCheapestTier(gifts: TelegramApiGift[]): TelegramApiGift[] {
    const sendable = gifts.filter(
      (g) =>
        g.personal_remaining_count === undefined ||
        g.personal_remaining_count === null ||
        g.personal_remaining_count > 0,
    );
    const pool = sendable.length > 0 ? sendable : gifts;
    if (pool.length === 0) return [];
    const minStars = Math.min(...pool.map((g) => g.star_count));
    return pool.filter((g) => g.star_count === minStars);
  }

  /** Подарки с ценой ≤ maxStars (для дифференциации ставок). */
  private pickGiftsUpToStars(gifts: TelegramApiGift[], maxStars: number): TelegramApiGift[] {
    const sendable = gifts.filter(
      (g) =>
        g.personal_remaining_count === undefined ||
        g.personal_remaining_count === null ||
        g.personal_remaining_count > 0,
    );
    const pool = sendable.length > 0 ? sendable : gifts;
    const filtered = pool.filter((g) => g.star_count <= maxStars);
    // Если ни одного подарка не попало — fallback на cheapest
    if (filtered.length === 0) {
      const minStars = Math.min(...pool.map((g) => g.star_count));
      return pool.filter((g) => g.star_count === minStars);
    }
    return filtered;
  }

  private toWheelItem(g: TelegramApiGift): WheelTelegramGiftItem {
    const name = g.sticker?.emoji?.trim() || 'Gift';
    return {
      type: 'telegram-gift',
      telegramGiftId: g.id,
      starCount: g.star_count,
      name,
      image: '',
    };
  }

  /**
   * Готовит слоты барабана: несколько вариантов из самого дешёвого тира (медведь, сердце и т.д.).
   */
  async buildCheapestWheelSlices(maxCount: number): Promise<WheelTelegramGiftItem[]> {
    return this.buildWheelSlices(15, maxCount);
  }

  /**
   * Готовит слоты барабана из подарков с ценой ≤ maxStars.
   * Используется для дифференциации ставок: 0.2→15★, 0.5→25★, 1→50★.
   */
  async buildWheelSlices(maxStars: number, maxCount: number): Promise<WheelTelegramGiftItem[]> {
    if (!this.apiBase || maxCount <= 0) {
      return [];
    }
    const gifts = await this.fetchAvailableGifts();
    const pool = this.pickGiftsUpToStars(gifts, maxStars);
    if (pool.length === 0) {
      return [];
    }

    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const out: WheelTelegramGiftItem[] = [];
    for (let i = 0; i < maxCount; i++) {
      out.push(this.toWheelItem(shuffled[i % shuffled.length]));
    }
    return out;
  }

  async sendGiftToUser(telegramUserId: string, giftId: string): Promise<boolean> {
    if (!this.apiBase) {
      this.logger.warn('sendGift: TELEGRAM_BOT_TOKEN missing');
      return false;
    }
    const uid = Number(telegramUserId);
    if (!Number.isFinite(uid)) {
      return false;
    }
    try {
      const { data } = await axios.post<{ ok: boolean; description?: string }>(
        `${this.apiBase}/sendGift`,
        {
          user_id: uid,
          gift_id: giftId,
        },
        { timeout: 30000 },
      );
      if (!data?.ok) {
        this.logger.warn(`sendGift failed: ${data?.description ?? 'unknown'}`);
        return false;
      }
      return true;
    } catch (e) {
      this.logger.warn(`sendGift error: ${(e as Error).message}`);
      return false;
    }
  }
}
