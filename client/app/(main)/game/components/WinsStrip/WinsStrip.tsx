'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import cls from './WinsStrip.module.scss';
import { getSocketBaseUrl } from '@/entites/multiplayer/lib/socketBaseUrl';
import { GiftImageOrLottie } from '@/shared/ui/GiftImageOrLottie/GiftImageOrLottie';

type WinsItem = {
    image: string;
    lottieUrl?: string;
    name?: string;
    createdAt: number;
    source: 'win' | 'random';
};

type WinsInitPayload = { items: WinsItem[] };
type WinsUpdatePayload = { item: WinsItem; items: WinsItem[] };

export function WinsStrip() {
    const [items, setItems] = useState<WinsItem[]>([]);
    const socketRef = useRef<Socket | null>(null);

    const images = useMemo(() => items.filter((x) => typeof x?.image === 'string' && x.image.length > 0), [items]);

    useEffect(() => {
        const baseUrl = getSocketBaseUrl();
        if (!baseUrl) return;

        const socket = io(`${baseUrl}/wins`, {
            path: '/socket.io',
            transports: ['websocket', 'polling'],
        });
        socketRef.current = socket;

        const onInit = (payload: WinsInitPayload) => {
            if (Array.isArray(payload?.items)) setItems(payload.items);
        };
        const onUpdate = (payload: WinsUpdatePayload) => {
            if (Array.isArray(payload?.items)) setItems(payload.items);
        };

        socket.on('wins:init', onInit);
        socket.on('wins:update', onUpdate);

        return () => {
            socket.off('wins:init', onInit);
            socket.off('wins:update', onUpdate);
            socket.disconnect();
            socketRef.current = null;
        };
    }, []);

    if (images.length === 0) return null;

    return (
        <div className={cls.root}>
            <div className={cls.label}>
                <span>WINS</span>
                <span className={cls.dot} aria-hidden />
            </div>

            <div className={cls.list} role="list" aria-label="Recent wins">
                {images.slice(0, 10).map((it, idx) => (
                    <div key={`${it.createdAt}-${idx}`} className={cls.item} role="listitem">
                        <GiftImageOrLottie
                            image={it.image}
                            lottieUrl={it.lottieUrl}
                            alt={it.name ?? 'Gift'}
                            fillContainer
                            hideLottieBackground
                            className={cls.media}
                            imageClassName={cls.img}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

