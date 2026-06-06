import type { TelegramGiftConfig } from './telegram-gift-config.interface';
import { heartWithRibbonGiftConfig } from './gifts/heart-with-ribbon.config';
import { teddyBearGiftConfig } from './gifts/teddy-bear.config';
import { giftBoxGiftConfig } from './gifts/gift-box.config';
import { redRoseGiftConfig } from './gifts/red-rose.config';
import { birthdayCakeGiftConfig } from './gifts/birthday-cake.config';
import { bouquetGiftConfig } from './gifts/bouquet.config';
import { rocketGiftConfig } from './gifts/rocket.config';
import { trophyGiftConfig } from './gifts/trophy.config';
import { diamondRingGiftConfig } from './gifts/diamond-ring.config';
import { diamondGiftConfig } from './gifts/diamond.config';
import { champagneGiftConfig } from './gifts/champagne.config';

export type { TelegramGiftConfig } from './telegram-gift-config.interface';

/** Полный каталог подарков Telegram Stars (порядок как в UI Telegram). */
export const TELEGRAM_GIFT_CONFIGS: readonly TelegramGiftConfig[] = [
  heartWithRibbonGiftConfig,
  teddyBearGiftConfig,
  giftBoxGiftConfig,
  redRoseGiftConfig,
  birthdayCakeGiftConfig,
  bouquetGiftConfig,
  rocketGiftConfig,
  trophyGiftConfig,
  diamondRingGiftConfig,
  diamondGiftConfig,
  champagneGiftConfig,
] as const;

export const TELEGRAM_GIFT_CONFIG_BY_ID: Readonly<
  Record<string, TelegramGiftConfig>
> = Object.fromEntries(
  TELEGRAM_GIFT_CONFIGS.map((cfg) => [cfg.telegramGiftId, cfg]),
);

export const TELEGRAM_GIFT_CONFIG_BY_SLUG: Readonly<
  Record<string, TelegramGiftConfig>
> = Object.fromEntries(TELEGRAM_GIFT_CONFIGS.map((cfg) => [cfg.slug, cfg]));

/** Минимальный тир (15 ⭐) — сейчас используется на барабане. */
export const TELEGRAM_CHEAPEST_TIER = 15 as const;

export function getTelegramGiftsByTier(
  tier: TelegramGiftConfig['tier'],
): TelegramGiftConfig[] {
  return TELEGRAM_GIFT_CONFIGS.filter((cfg) => cfg.tier === tier);
}

export function getWheelEnabledTelegramGifts(): TelegramGiftConfig[] {
  return TELEGRAM_GIFT_CONFIGS.filter((cfg) => cfg.wheelEnabled);
}

export function getCheapestTelegramGifts(): TelegramGiftConfig[] {
  return getTelegramGiftsByTier(TELEGRAM_CHEAPEST_TIER);
}
