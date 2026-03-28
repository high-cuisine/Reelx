import type { StaticImageData } from 'next/image';
import boxImage from '@/assets/Box.png';

/** Цвета подсветки карточки — сервер их не отдаёт, берём стабильно по id стола */
export const TABLE_GLOW_COLORS = [
    '#00FF00',
    '#FFA500',
    '#FF00FF',
    '#00BFFF',
    '#7456E9',
    '#20A275',
    '#E94B4B',
    '#F5D742',
] as const;

/** Цвета аватаров на столе и в списке игроков */
export const TABLE_SEAT_COLORS = [
    '#640E8C',
    '#199CB3',
    '#7456E9',
    '#20A275',
    '#E94B4B',
    '#F5A623',
    '#5B4FC6',
    '#0098EA',
] as const;

/** Псевдо-никнеймы для аватарок в сетке — сервер отдаёт только userId */
export const TABLE_PLACEHOLDER_NAMES = [
    '@player',
    '@guest',
    '@ton',
    '@star',
    '@lucky',
    '@roll',
    '@pvp',
    '@table',
] as const;

/** Картинки «подарка» на карточке — с сервера нет, выбираем из пула локально */
export const TABLE_GIFT_IMAGES: StaticImageData[] = [boxImage];

export function stablePick<T>(arr: readonly T[], seed: string): T {
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
        h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
    }
    const idx = Math.abs(h) % arr.length;
    return arr[idx];
}
