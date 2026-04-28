import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../libs/infrustructure/prisma/prisma.service';
import { RedisService } from '../../libs/infrustructure/redis/redis.service';
import type { WinsItem } from './wins.types';

type BroadcastFn = (payload: { item: WinsItem; items: WinsItem[] }) => void;

@Injectable()
export class WinsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WinsService.name);

  private readonly CACHE_KEY = 'wins:latest10';
  private readonly LAST_ANY_PUSH_AT_KEY = 'wins:last_any_push_at';

  /** Во сколько раз ускоряем появление новых игрушек. */
  private readonly TICK_SPEEDUP = 2.5;
  /** Минимальный интервал между случайными игрушками (мс). */
  private readonly TICK_MIN_MS = Math.round(10_000 / this.TICK_SPEEDUP);
  /** Максимальный интервал между случайными игрушками (мс). */
  private readonly TICK_MAX_MS = Math.round(35_000 / this.TICK_SPEEDUP);

  private tickTimer: NodeJS.Timeout | null = null;
  private broadcastFn: BroadcastFn | null = null;

  constructor(
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  setBroadcaster(fn: BroadcastFn) {
    this.broadcastFn = fn;
  }

  async onModuleInit() {
    // Ensure some initial content (optional, but helps UX on empty DB)
    await this.ensureTickSoon();
    this.startTicker();
  }

  async onModuleDestroy() {
    this.clearTimer();
  }

  async getCachedItems(): Promise<WinsItem[]> {
    const raw = await this.redisService.get(this.CACHE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as WinsItem[];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((x) => typeof x?.image === 'string' && x.image.length > 0);
    } catch {
      return [];
    }
  }

  async recordWin(input: { image?: string | null; lottieUrl?: string | null; name?: string | null }) {
    const image = (input.image ?? '').trim();
    if (!image) return;

    const item: WinsItem = {
      image,
      lottieUrl: input.lottieUrl ?? undefined,
      name: input.name ?? undefined,
      createdAt: Date.now(),
      source: 'win',
    };

    const items = await this.pushToCache(item);
    this.broadcastFn?.({ item, items });

    // Сбрасываем таймер: после реального выигрыша делаем новую случайную паузу.
    this.scheduleNextTick();
  }

  private randDelay(): number {
    return this.TICK_MIN_MS + Math.floor(Math.random() * (this.TICK_MAX_MS - this.TICK_MIN_MS));
  }

  private clearTimer() {
    if (this.tickTimer) {
      clearTimeout(this.tickTimer);
      this.tickTimer = null;
    }
  }

  private scheduleNextTick() {
    this.clearTimer();
    const delay = this.randDelay();
    this.logger.debug(`Next random gift in ${Math.round(delay / 1000)}s`);
    this.tickTimer = setTimeout(() => {
      this.tickTimer = null;
      void this.tickOnce()
        .catch((e: any) => this.logger.warn(`Tick failed: ${e?.message ?? e}`))
        .finally(() => this.scheduleNextTick());
    }, delay);
  }

  private startTicker() {
    this.scheduleNextTick();
  }

  private async tickOnce() {
    // Защита от дублирования (например при быстром перезапуске модуля).
    const lastAnyPushAtRaw = await this.redisService.get(this.LAST_ANY_PUSH_AT_KEY);
    const lastAnyPushAt = lastAnyPushAtRaw ? parseInt(lastAnyPushAtRaw, 10) : 0;
    const now = Date.now();

    if (Number.isFinite(lastAnyPushAt) && now - lastAnyPushAt < this.TICK_MIN_MS - 1_000) return;

    const random = await this.pickRandomFromDb();
    if (!random) return;

    const item: WinsItem = {
      image: random.image,
      lottieUrl: random.lottieUrl ?? undefined,
      name: random.name ?? undefined,
      createdAt: now,
      source: 'random',
    };

    const items = await this.pushToCache(item);
    this.broadcastFn?.({ item, items });
  }

  private async ensureTickSoon() {
    const items = await this.getCachedItems();
    if (items.length > 0) return;
    // trigger a random item quickly after boot for "empty" state
    await this.redisService.set(this.LAST_ANY_PUSH_AT_KEY, '0');
    setTimeout(() => {
      void this.tickOnce().catch((e: unknown) =>
        this.logger.warn(`ensureTickSoon tick failed: ${e instanceof Error ? e.message : String(e)}`),
      );
    }, 800);
  }

  private async pushToCache(item: WinsItem): Promise<WinsItem[]> {
    const prev = await this.getCachedItems();
    const next = [item, ...prev].slice(0, 10);
    await this.redisService.set(this.CACHE_KEY, JSON.stringify(next));
    await this.redisService.set(this.LAST_ANY_PUSH_AT_KEY, String(Date.now()));
    return next;
  }

  private async pickRandomFromDb(): Promise<{ image: string; lottieUrl?: string | null; name?: string | null } | null> {
    const where = { image: { not: null } };
    try {
      const count = await this.prisma.userGifts.count({ where });
      if (count <= 0) return null;
      const skip = Math.floor(Math.random() * count);
      const row = await this.prisma.userGifts.findFirst({
        where,
        skip,
        select: { image: true, lottieUrl: true, giftName: true },
      });
      const image = (row?.image ?? '').trim();
      if (!image) return null;
      return { image, lottieUrl: row?.lottieUrl ?? null, name: row?.giftName ?? null };
    } catch (e: unknown) {
      // P2021 — таблицы нет (миграции / db push не применены к БД)
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2021') {
        this.logger.warn(
          `user_gifts недоступна (${e.meta?.table ?? 'unknown'}). Примените схему: prisma db push или migrate deploy с миграциями.`,
        );
        return null;
      }
      throw e;
    }
  }
}

