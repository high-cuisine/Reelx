'use client';

import { useEffect, useRef, useState } from 'react';

const ELIMINATION_FLASH_MS = 1500;

/**
 * При смене lastEliminatedUserId (новое выбывание) — 1.5 с центральный крестик и × под местом.
 * Первый синхронный рендер без анимации (реконнект).
 */
export function useEliminationFlash(lastEliminatedUserId: string | null) {
    const [flashUserId, setFlashUserId] = useState<string | null>(null);
    const isFirstSyncRef = useRef(true);
    const prevUidRef = useRef<string | null>(lastEliminatedUserId);

    useEffect(() => {
        if (isFirstSyncRef.current) {
            isFirstSyncRef.current = false;
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
    }, [lastEliminatedUserId]);

    return flashUserId;
}
