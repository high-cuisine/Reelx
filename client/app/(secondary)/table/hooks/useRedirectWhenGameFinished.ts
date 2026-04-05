'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/** Даёт увидеть финальный экран (барабан «Победил» и кнопку) перед уходом со стола. */
const REDIRECT_DELAY_MS = 2500;

export function useRedirectWhenGameFinished(phase: string | null | undefined, enabled: boolean) {
    const router = useRouter();
    const firedRef = useRef(false);

    useEffect(() => {
        if (!enabled || phase !== 'finished' || firedRef.current) return;

        const t = setTimeout(() => {
            firedRef.current = true;
            router.replace('/game');
        }, REDIRECT_DELAY_MS);

        return () => clearTimeout(t);
    }, [enabled, phase, router]);
}
