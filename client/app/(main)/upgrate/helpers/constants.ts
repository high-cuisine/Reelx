export const MULTIPLIERS = ['x1.5', 'x2', 'x3', 'x5', 'x10', 'x20'] as const;

export const MULTIPLIER_VALUES: Record<string, number> = {
    'x1.5': 1.5,
    'x2': 2,
    'x3': 3,
    'x5': 5,
    'x10': 10,
    'x20': 20,
};

export const FALLBACK_COLORS = ['#005F70', '#927DD5', '#4F7BDA', '#5B4FC6', '#20A275'];

/** Минимальная ставка (TON), при которой доступен выбор желаемого приза */
export const WISH_SELECTION_MIN_BET_TON = 50;
