import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../libs/infrustructure/prisma/prisma.service';
import { RedisService } from '../../libs/infrustructure/redis/redis.service';
import type { WinsItem } from './wins.types';

type BroadcastFn = (payload: { item: WinsItem; items: WinsItem[] }) => void;

@Injectable()
export class WinsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WinsService.name);

  private readonly CACHE_KEY = 'wins:latest10';
  private readonly LAST_ANY_PUSH_AT_KEY = 'wins:last_any_push_at';

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
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
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
  }

  private startTicker() {
    if (this.tickTimer) return;
    this.tickTimer = setInterval(() => {
      void this.tickOnce().catch((e: any) => {
        this.logger.warn(`Tick failed: ${e?.message ?? e}`);
      });
    }, 15_000);
  }

  private async tickOnce() {
    const lastAnyPushAtRaw = await this.redisService.get(this.LAST_ANY_PUSH_AT_KEY);
    const lastAnyPushAt = lastAnyPushAtRaw ? parseInt(lastAnyPushAtRaw, 10) : 0;
    const now = Date.now();

    // If something (real win or random) was pushed recently, do nothing.
    if (Number.isFinite(lastAnyPushAt) && now - lastAnyPushAt < 14_500) return;

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
    setTimeout(() => void this.tickOnce(), 800);
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
  }
}

