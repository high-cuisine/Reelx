import type { TableGameState, TableState } from '@/entites/multiplayer/api/api';

/** Участники стола, уже выбывшие из активного розыгрыша. */
export function eliminatedParticipantIds(table: TableState, game: TableGameState): Set<string> {
    const activeSet = new Set(game.activeUserIds);
    return new Set(
        table.participants.map((p) => p.userId).filter((id) => !activeSet.has(id)),
    );
}
