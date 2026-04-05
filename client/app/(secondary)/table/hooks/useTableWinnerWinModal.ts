'use client';

import { useEffect, useRef } from 'react';
import type { TableGameState, TableState } from '@/entites/multiplayer/api/api';
import { eventBus, MODAL_EVENTS } from '@/features/eventBus/eventBus';

/** Один раз открывает WinModal победителю, как в upgrate при одном подарке. */
export function useTableWinnerWinModal(
    table: TableState | null,
    game: TableGameState | null,
    myUserId: string | null,
) {
    const emittedRef = useRef(false);

    useEffect(() => {
        if (!table || !game || !myUserId) return;
        if (game.phase !== 'finished' || game.winnerUserId !== myUserId) return;
        const p = game.winnerPrize;
        if (!p?.giftId) return;
        if (emittedRef.current) return;
        emittedRef.current = true;

        eventBus.emit(MODAL_EVENTS.OPEN_WIN_MODAL, {
            selectedItem: {
                name: p.name,
                price: p.priceTon,
                image: p.image ?? undefined,
                lottie: p.lottieUrl ?? undefined,
            },
            rolls: 1,
            totalPrice:
                game.potTon ?? table.betAmount * table.participants.length,
            giftId: p.giftId,
        });
    }, [table, game, myUserId]);
}
