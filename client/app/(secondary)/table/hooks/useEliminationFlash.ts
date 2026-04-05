'use client';

import { useEffect, useRef, useState } from 'react';
import type { TableGamePhase } from '@/entites/multiplayer/api/api';

const ELIMINATION_FLASH_MS = 1500;

/**
 * При смене lastEliminatedUserId в фазе playing — 1.5 с показываем центральный крестик и X под местом
 * выбывшего. Вход в playing / реконнект без смены uid не анимирует.
 */
export function useEliminationFlash(phase: TableGamePhase, lastEliminatedUserId: string | null) {
    const [flashUserId, setFlashUserId] = useState<string | null>(null);
    const skipNextDiffRef = useRef(true);
    const prevPhaseRef = useRef<TableGamePhase>(phase);
    const prevUidRef = useRef<string | null>(lastEliminatedUserId);

    useEffect(() => {
        const prevPhase = prevPhaseRef.current;
        prevPhaseRef.current = phase;

        if (phase !== 'playing') {
            setFlashUserId(null);
            prevUidRef.current = lastEliminatedUserId;
            if (phase === 'lobby') {
                skipNextDiffRef.current = true;
            }
            return;
        }

        if (skipNextDiffRef.current) {
            skipNextDiffRef.current = false;
            prevUidRef.current = lastEliminatedUserId;
            return;
        }

        if (prevPhase !== 'playing') {
            prevUidRef.current = lastEliminatedUserId;
            return;
        }

        const cur = lastEliminatedUserId;
        if (cur != null && prevUidRef.current !== cur) {
            setFlashUserId(cur);
            const t = setTimeout(() => setFlashUserId(null), ELIMINATION_FLASH_MS);
            prevUidRef.current = cur;
            return () => clearTimeout(t);
        }

        prevUidRef.current = cur;
    }, [phase, lastEliminatedUserId]);

    return flashUserId;
}
