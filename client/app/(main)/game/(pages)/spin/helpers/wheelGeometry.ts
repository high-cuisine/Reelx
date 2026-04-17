import type { GiftItem } from '@/entites/gifts/interfaces/giftItem.interface';

export type WheelGroup = {
    item: GiftItem;
    count: number;
    startIndex: number;
};

const itemKey = (item: GiftItem): string =>
    `${item.type}__${item.name}__${item.price}`;

/** Как в Wheel.tsx — группы по типу+имени+цене, порядок по первому появлению. */
export function buildWheelGroups(items: GiftItem[]): WheelGroup[] {
    const map = new Map<string, { item: GiftItem; count: number; firstIndex: number }>();

    items.forEach((item, index) => {
        const key = itemKey(item);
        const existing = map.get(key);

        if (existing) {
            existing.count += 1;
        } else {
            map.set(key, {
                item,
                count: 1,
                firstIndex: index,
            });
        }
    });

    const sorted = Array.from(map.values()).sort((a, b) => a.firstIndex - b.firstIndex);

    const groups: WheelGroup[] = [];
    let currentStartIndex = 0;

    sorted.forEach(({ item, count }) => {
        groups.push({
            item,
            count,
            startIndex: currentStartIndex,
        });
        currentStartIndex += count;
    });

    return groups;
}

/** Визуальные веса групп (±20% для gift), сумма = totalItemsCount — как в Wheel.tsx. */
export function computeGroupVisualSizes(
    groups: WheelGroup[],
    totalItemsCount: number,
): number[] {
    if (totalItemsCount <= 0) {
        return groups.map((g) => g.count);
    }

    const baseTotal = groups.reduce((sum, group) => sum + group.count, 0) || totalItemsCount;
    const giftGroupCount = groups.filter((g) => g.item.type === 'gift').length;

    let giftIndex = 0;
    const rawWeights = groups.map((group) => {
        if (group.item.type === 'gift') {
            const t = giftGroupCount > 1 ? giftIndex / (giftGroupCount - 1) : 0.5;
            const multiplier = 0.8 + 0.4 * t;
            giftIndex += 1;
            return group.count * multiplier;
        }
        return group.count;
    });

    const rawTotal = rawWeights.reduce((sum, w) => sum + w, 0);
    const scale = rawTotal > 0 ? baseTotal / rawTotal : 1;
    return rawWeights.map((w) => w * scale);
}

/** Центр сектора группы в градусах (0° = сверху), как getSegmentCenterAngle в Wheel. */
export function getGroupCenterAngleDeg(
    groupIndex: number,
    groupVisualSizes: number[],
    totalItemsCount: number,
): number {
    const unitAngle = 360 / totalItemsCount;
    let sum = 0;
    for (let i = 0; i < groupIndex; i++) sum += groupVisualSizes[i];
    return (sum + groupVisualSizes[groupIndex] / 2) * unitAngle;
}

/**
 * Угол центра слота flatIndex (тот же ключ группы, что и в conic-gradient).
 * Совпадает с геометрией Wheel при той же схеме группировки.
 */
export function getFlatSlotCenterAngleDeg(
    items: GiftItem[],
    flatIndex: number,
): number {
    if (items.length === 0 || flatIndex < 0 || flatIndex >= items.length) {
        return 0;
    }
    const groups = buildWheelGroups(items);
    const groupVisualSizes = computeGroupVisualSizes(groups, items.length);
    const k = itemKey(items[flatIndex]);
    const gi = groups.findIndex((g) => itemKey(g.item) === k);
    const groupIndex = gi < 0 ? 0 : gi;
    return getGroupCenterAngleDeg(groupIndex, groupVisualSizes, items.length);
}
