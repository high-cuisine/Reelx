/** Максимум уникальных секторов на барабане */
export const MAX_WHEEL_SECTORS = 8;

/** Всего слотов на solo-барабане */
export const SOLO_WHEEL_TOTAL_SLOTS = MAX_WHEEL_SECTORS;

/** Ставки только с Telegram-подарками + no-loot (без NFT) */
export const TELEGRAM_ONLY_STAKE_TIERS = [
  { ton: 0.2, stars: 18, telegramSlots: 4, maxGiftStars: 15 },
  { ton: 0.5, stars: 45, telegramSlots: 6, maxGiftStars: 25 },
  { ton: 1, stars: 90, telegramSlots: 10, maxGiftStars: 50 },
] as const;

/** Дискретные уровни ставки для UI (+ / −) */
export const STAKE_TIERS_TON = [0.2, 0.5, 1, 2, 5, 10, 15, 20, 50] as const;
export const STAKE_TIERS_STARS = [18, 45, 90, 180, 200, 400, 600, 800, 2000] as const;

/** С этой ставки (TON) — прежняя solo-логика с NFT */
export const NFT_SOLO_STAKE_MIN_TON = 2;
export const NFT_SOLO_STAKE_MAX_TON = 5;

export const MIN_PRODUCT_STAKE_TON = TELEGRAM_ONLY_STAKE_TIERS[0].ton;
export const MIN_PRODUCT_STAKE_STARS = TELEGRAM_ONLY_STAKE_TIERS[0].stars;

export function matchTelegramOnlyTier(amountTon: number): number | null {
  const rounded = Math.round(amountTon * 10) / 10;
  const tier = TELEGRAM_ONLY_STAKE_TIERS.find((t) => t.ton === rounded);
  return tier?.telegramSlots ?? null;
}

/** Совпадение по исходной ставке из запроса (TON или Stars) */
export function matchTelegramOnlyStakeTier(
  amount: number,
  currency: 'ton' | 'stars' | undefined,
): number | null {
  return getTelegramOnlyTierConfig(amount, currency)?.telegramSlots ?? null;
}

export function getTelegramOnlyTierConfig(
  amount: number,
  currency: 'ton' | 'stars' | undefined,
): (typeof TELEGRAM_ONLY_STAKE_TIERS)[number] | null {
  if (currency === 'stars') {
    return TELEGRAM_ONLY_STAKE_TIERS.find((t) => t.stars === amount) ?? null;
  }
  const rounded = Math.round(amount * 10) / 10;
  return TELEGRAM_ONLY_STAKE_TIERS.find((t) => t.ton === rounded) ?? null;
}

export function isNftSoloStake(amountTon: number): boolean {
  return (
    amountTon >= NFT_SOLO_STAKE_MIN_TON - Number.EPSILON &&
    amountTon <= NFT_SOLO_STAKE_MAX_TON + Number.EPSILON
  );
}
