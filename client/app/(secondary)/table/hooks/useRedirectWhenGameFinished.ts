'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { TABLE_WIN_GIFT_MODAL_DELAY_MS } from './constants';

const DEFAULT_REDIRECT_MS = 2500;
/** Время после фазы finished: задержка перед модалкой + запас на экран подарка. */
const REDIRECT_WHEN_WIN_MODAL_MS = TABLE_WIN_GIFT_MODAL_DELAY_MS + 5500;

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
