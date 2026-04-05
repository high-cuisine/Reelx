'use client';

import { useMemo } from 'react';
import type { TableState } from '@/entites/multiplayer/api/api';
import { eliminatedParticipantIds } from '../helpers/tableDerived';
import {
    defaultTableGameClient,
    mapTableStateToVisualPlayers,
    orderedPlayersByUserIds,
    tableCurrencyToUi,
    tableDrumCenterText,
} from '../mapTablePlayers';

export function useTablePageDerived(table: TableState | null) {
    const players = useMemo(
        () => (table ? mapTableStateToVisualPlayers(table) : []),
        [table],
    );

    const game = useMemo(
        () => (table ? defaultTableGameClient(table) : null),
        [table],
    );

    const drumPlayers = useMemo(() => {
        if (!table || !game) return [];
        return orderedPlayersByUserIds(players, game.activeUserIds);
    }, [table, game, players]);

    const eliminatedUserIds = useMemo(
        () => (table && game ? eliminatedParticipantIds(table, game) : new Set<string>()),
        [table, game],
    );

    const centerText = useMemo(
        () => (table && game ? tableDrumCenterText(table, game) : '—'),
        [table, game],
    );

    const uiCurrency = table ? tableCurrencyToUi(table) : 'ton';

    return {
        players,
        game,
        drumPlayers,
        eliminatedUserIds,
        centerText,
        uiCurrency,
    };
}
