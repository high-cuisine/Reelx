import type { TableState } from '@/entites/multiplayer/api/api';
import {
    TABLE_PLACEHOLDER_NAMES,
    TABLE_SEAT_COLORS,
    stablePick,
} from '../../constants/tableVisualPool';
import type { TablePlayer } from './components/types';

export function mapTableStateToVisualPlayers(table: TableState): TablePlayer[] {
    return table.participants.map((userId, index) => {
        const name = stablePick(TABLE_PLACEHOLDER_NAMES, `${table.ownerId}-${userId}-${index}`);
        const color = stablePick(TABLE_SEAT_COLORS, userId);
        const tail = name.startsWith('@') ? name.slice(1) : name;
        const initial = (tail[0] ?? userId[0] ?? '?').toUpperCase();
        return {
            id: userId,
            name,
            initial,
            color,
            bet: table.betAmount,
        };
    });
}

export function tableCurrencyToUi(table: TableState): 'ton' | 'star' {
    return table.currency === 'TON' ? 'ton' : 'star';
}

export function bankTotal(table: TableState): number {
    return table.participants.length * table.betAmount;
}
