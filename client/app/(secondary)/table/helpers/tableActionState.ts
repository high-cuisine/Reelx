import type { TableGameState, TableState } from '@/entites/multiplayer/api/api';

export type TablePrimaryAction =
    | { kind: 'login_hint' }
    | { kind: 'disabled'; label: string }
    | { kind: 'ready' };

export function resolveTablePrimaryAction(
    table: TableState,
    game: TableGameState,
    myUserId: string | null,
): TablePrimaryAction {
    if (!myUserId) {
        return { kind: 'login_hint' };
    }
    if (game.phase === 'finished') {
        return { kind: 'disabled', label: 'Игра окончена' };
    }
    if (game.phase === 'playing') {
        return { kind: 'disabled', label: 'Идёт розыгрыш…' };
    }
    const full = table.participants.length === table.maxPlayers;
    if (!full) {
        return {
            kind: 'disabled',
            label: `Ждём игроков (${table.participants.length}/${table.maxPlayers})`,
        };
    }
    const myReady = game.readyUserIds.includes(myUserId);
    if (myReady) {
        return { kind: 'disabled', label: 'Ожидаем остальных…' };
    }
    return { kind: 'ready' };
}
