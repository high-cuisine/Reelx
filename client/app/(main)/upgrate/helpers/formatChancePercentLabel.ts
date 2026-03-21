/** Убирает лишние нули у десятичной строки («2.0» → «2»). */
function trimTrailingZeros(s: string): string {
    if (!s.includes('.')) return s;
    const t = s.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
    return t === '' ? '0' : t;
}

/**
 * Подпись процента шанса для UI (не круг): не обрезать до целого при ~2.3%.
 * — от 10% и выше — целое;
 * — от 1% до 10% — один знак после запятой;
 * — от 0.1% до 1% — шаг 0.1%;
 * — меньше 0.1% — два знака, для ненулевого шанса не ниже 0.01%.
 */
export function formatChancePercentLabel(chance: number): string {
    const p = Math.min(100, Math.max(0, chance * 100));
    if (!Number.isFinite(p) || p <= 0) return '0';
    if (p < 0.01) return '0.01';

    if (p >= 10) {
        return String(Math.round(p));
    }
    if (p >= 1) {
        return trimTrailingZeros(p.toFixed(1));
    }
    if (p >= 0.1) {
        return trimTrailingZeros(p.toFixed(1));
    }
    return trimTrailingZeros(p.toFixed(2));
}
