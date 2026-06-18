/** Дискретные уровни ставки (+ / −), порядок по возрастанию */
export const STAKE_TIERS_TON = [0.2, 0.5, 1, 2, 5, 10, 15, 20, 50] as const;

/** Эквивалент TON-уровней в Stars (согласовано с server stake-tiers.config) */
export const STAKE_TIERS_STARS = [18, 45, 90, 180, 200, 400, 600, 800, 2000] as const;

/** Только Telegram-подарки + no-loot (без NFT) */
export const TELEGRAM_ONLY_STAKE_TIERS = [
    { ton: 0.2, stars: 18, telegramSlots: 4 },
    { ton: 0.5, stars: 45, telegramSlots: 6 },
    { ton: 1, stars: 90, telegramSlots: 10 },
] as const;

export type StakeCurrency = 'ton' | 'stars';

export const getStakeTiers = (currency: StakeCurrency): readonly number[] =>
    currency === 'stars' ? STAKE_TIERS_STARS : STAKE_TIERS_TON;

export const isSameStake = (a: number, b: number): boolean =>
    Math.abs(a - b) < 0.001;

export const findStakeTierIndex = (tiers: readonly number[], value: number): number =>
    tiers.findIndex((tier) => isSameStake(tier, value));

export const isTelegramOnlyStake = (
    stake: number,
    currency: StakeCurrency,
): boolean =>
    TELEGRAM_ONLY_STAKE_TIERS.some((tier) =>
        currency === 'stars'
            ? tier.stars === stake
            : isSameStake(tier.ton, stake),
    );

export const mapStakeToCurrency = (
    stake: number,
    from: StakeCurrency,
    to: StakeCurrency,
): number => {
    if (from === to) return stake;
    const fromTiers = getStakeTiers(from);
    const toTiers = getStakeTiers(to);
    const idx = findStakeTierIndex(fromTiers, stake);
    return toTiers[idx >= 0 ? idx : 0];
};

export const formatStakeAmount = (amount: number, currency: StakeCurrency): string => {
    if (currency === 'stars') {
        return String(Math.round(amount));
    }
    const rounded = Math.round(amount * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};
