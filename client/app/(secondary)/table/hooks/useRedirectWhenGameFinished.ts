'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const DEFAULT_REDIRECT_MS = 2500;
const REDIRECT_WHEN_WIN_MODAL_MS = 5500;

type Options = { delayMs?: number };

export function useRedirectWhenGameFinished(
    phase: string | null | undefined,
    enabled: boolean,
    options?: Options,
) {
    const router = useRouter();
    const firedRef = useRef(false);
    const delayMs = options?.delayMs ?? DEFAULT_REDIRECT_MS;

    useEffect(() => {
        if (!enabled || phase !== 'finished' || firedRef.current) return;

        const t = setTimeout(() => {
            firedRef.current = true;
            router.replace('/game');
        }, delayMs);

        return () => clearTimeout(t);
    }, [enabled, phase, router, delayMs]);
}

export { REDIRECT_WHEN_WIN_MODAL_MS, DEFAULT_REDIRECT_MS };
