import type { TableGameState, TableState } from '@/entites/multiplayer/api/api';
import { TABLE_SEAT_COLORS, stablePick } from '../../(main)/game/constants/tableVisualPool';
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

/** Порядок игроков на барабане по списку userId (activeUserIds и т.д.). */
export function orderedPlayersByUserIds(
    allPlayers: TablePlayer[],
    userIds: string[],
): TablePlayer[] {
    const byId = new Map(allPlayers.map((p) => [p.id, p]));
    return userIds.map((id) => byId.get(id)).filter((p): p is TablePlayer => p != null);
}

export function tableCurrencyToUi(table: TableState): 'ton' | 'star' {
    return table.currency === 'TON' ? 'ton' : 'star';
}

export function bankTotal(table: TableState): number {
    return table.participants.length * table.betAmount;
}

function displayNameShort(username: string) {
    const u = username.startsWith('@') ? username : `@${username}`;
    return u.length > 14 ? `${u.slice(0, 12)}…` : u;
}

export function defaultTableGameClient(table: TableState): TableGameState {
    return (
        table.game ?? {
            phase: 'lobby',
            readyUserIds: [],
            activeUserIds: table.participants.map((p) => p.userId),
            lastEliminatedUserId: null,
            lastEliminatedSectorIndex: null,
            winnerUserId: null,
            round: 0,
        }
    );
}

/** Текст в центре барабана по фазе игры. */
export function tableDrumCenterText(table: TableState, game: TableGameState): string {
    if (game.phase === 'lobby') {
        const n = table.participants.length;
        const max = table.maxPlayers;
        if (n < max) return `Ожидание\n${n}/${max}`;
        const r = game.readyUserIds.length;
        return `Готовность\n${r}/${max}`;
    }
    if (game.phase === 'round_break') {
        const need = game.activeUserIds.length;
        const r = game.activeUserIds.filter((id) => game.readyUserIds.includes(id)).length;
        return `Готовность\n${r}/${need}`;
    }
    if (game.phase === 'playing') {
        return game.round === 0 ? 'Старт' : `Раунд ${game.round}`;
    }
    if (game.phase === 'finished' && game.winnerUserId) {
        const w = table.participants.find((p) => p.userId === game.winnerUserId);
        const name = w ? displayNameShort(w.username) : 'Победитель';
        return `Победил\n${name}`;
    }
    return '—';
}
