import { MAX_WHEEL_SECTORS } from '../constants/stake-tiers.config';

const NO_LOOT_SLOT = {
  type: 'no-loot' as const,
  price: 0,
  image: '',
  name: 'No loot',
};

function wheelItemKey(item: {
  type?: string;
  name?: string;
  price?: number;
  telegramGiftId?: string;
}): string {
  if (item.type === 'telegram-gift' && item.telegramGiftId) {
    return `${item.type}__${item.telegramGiftId}__${item.price}`;
  }
  return `${item.type}__${item.name}__${item.price}`;
}

/**
 * Ограничивает число уникальных секторов на барабане.
 * Лишние группы заменяются на no-loot, чтобы не ломать веса слотов.
 */
export function capWheelToMaxSectors<T extends Record<string, unknown>>(
  slots: T[],
  maxSectors: number = MAX_WHEEL_SECTORS,
): T[] {
  if (slots.length === 0 || maxSectors <= 0) {
    return slots;
  }

  const groups = new Map<string, { item: T; indices: number[]; firstIndex: number }>();

  slots.forEach((item, index) => {
    const key = wheelItemKey(item);
    const existing = groups.get(key);
    if (existing) {
      existing.indices.push(index);
      return;
    }
    groups.set(key, { item, indices: [index], firstIndex: index });
  });

  if (groups.size <= maxSectors) {
    return slots;
  }

  const sortedGroups = Array.from(groups.values()).sort((a, b) => a.firstIndex - b.firstIndex);
  const keptGroups = new Set(sortedGroups.slice(0, maxSectors).map((g) => wheelItemKey(g.item)));
  const result = [...slots];

  for (const group of sortedGroups) {
    if (keptGroups.has(wheelItemKey(group.item))) {
      continue;
    }
    for (const index of group.indices) {
      result[index] = { ...NO_LOOT_SLOT } as T;
    }
  }

  return result;
}
