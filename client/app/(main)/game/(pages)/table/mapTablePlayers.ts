import type { TableState } from '@/entites/multiplayer/api/api';
import { TABLE_SEAT_COLORS, stablePick } from '../../constants/tableVisualPool';
import type { TablePlayer } from './components/types';

function displayUsername(username: string) {
    return username.startsWith('@') ? username : `@${username}`;
}

function initialFromUsername(username: string, userId: string): string {
    const t = username.trim();
    if (t.startsWith('@')) {
        const c = t.slice(1).charAt(0);
        return (c || userId[0] || '?').toUpperCase();
    }
    const c = t.charAt(0);
    return (c || userId[0] || '?').toUpperCase();
}

export function mapTableStateToVisualPlayers(table: TableState): TablePlayer[] {
    return table.participants.map((p) => {
        const color = stablePick(TABLE_SEAT_COLORS, p.userId);
        return {
            id: p.userId,
            name: displayUsername(p.username),
            initial: initialFromUsername(p.username, p.userId),
            color,
            bet: table.betAmount,
            photoUrl: p.photoUrl,
        };
    });
}

export function tableCurrencyToUi(table: TableState): 'ton' | 'star' {
    return table.currency === 'TON' ? 'ton' : 'star';
}

export function bankTotal(table: TableState): number {
    return table.participants.length * table.betAmount;
}

/** Текст в центре «колеса» на столе: полный набор мест или ожидание. */
export function tableWheelStatusText(table: TableState): string {
    const n = table.participants.length;
    const max = table.maxPlayers;
    if (n >= max) return 'Все на месте';
    return `Ожидание ${n}/${max}`;
}
