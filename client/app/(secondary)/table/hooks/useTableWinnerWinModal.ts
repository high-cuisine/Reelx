'use client';

import { useEffect, useRef } from 'react';
import type { TableGameState, TableState } from '@/entites/multiplayer/api/api';
import { eventBus, MODAL_EVENTS } from '@/features/eventBus/eventBus';
import { TABLE_WIN_GIFT_MODAL_DELAY_MS } from './constants';

/** Один раз открывает WinModal победителю после паузы (сектор уже выбран). */
export function useTableWinnerWinModal(
    table: TableState | null,
    game: TableGameState | null,
    myUserId: string | null,
) {
    const emittedRef = useRef(false);
    const tableRef = useRef(table);
    const gameRef = useRef(game);
    tableRef.current = table;
    gameRef.current = game;

    useEffect(() => {
        if (game?.phase !== 'finished') {
            emittedRef.current = false;
        }
    }, [game?.phase]);

    const phase = game?.phase ?? null;
    const winnerUserId = game?.winnerUserId ?? null;
    const winnerGiftId = game?.winnerPrize?.giftId ?? null;

    useEffect(() => {
        if (phase !== 'finished' || !myUserId || winnerUserId !== myUserId || !winnerGiftId) return;
        if (emittedRef.current) return;

        const timer = window.setTimeout(() => {
            const g = gameRef.current;
            const tbl = tableRef.current;
            if (!g || !tbl || emittedRef.current) return;
            if (g.phase !== 'finished' || g.winnerUserId !== myUserId) return;
            const p = g.winnerPrize;
            if (!p?.giftId) return;

            emittedRef.current = true;
            eventBus.emit(MODAL_EVENTS.OPEN_WIN_MODAL, {
                selectedItem: {
                    name: p.name,
                    price: p.priceTon,
                    image: p.image ?? undefined,
                    lottie: p.lottieUrl ?? undefined,
                },
                rolls: 1,
                totalPrice: g.potTon ?? tbl.betAmount * tbl.participants.length,
                giftId: p.giftId,
            });
        }, TABLE_WIN_GIFT_MODAL_DELAY_MS);

        return () => window.clearTimeout(timer);
    }, [phase, winnerUserId, winnerGiftId, myUserId]);
}
