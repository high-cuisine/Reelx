'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { TableState } from '../api/api';
import { getSocketBaseUrl } from '../lib/socketBaseUrl';

type TablesCreatedPayload = { table: TableState };
type TablesRemovedPayload = { ownerId: string };

export interface UseTablesLobbySocketOptions {
    /** Пока false — не подключаемся (например, нет токена или фатальная ошибка загрузки). */
    enabled: boolean;
    onTableCreated: (table: TableState) => void;
    onTableRemoved: (ownerId: string) => void;
}

/**
 * Namespace `/multiplayer`: сервер кладёт сокет в комнату лобби; события tables:created / tables:removed.
 */
export function useTablesLobbySocket({
    enabled,
    onTableCreated,
    onTableRemoved,
}: UseTablesLobbySocketOptions): void {
    const onCreatedRef = useRef(onTableCreated);
    const onRemovedRef = useRef(onTableRemoved);
    useLayoutEffect(() => {
        onCreatedRef.current = onTableCreated;
        onRemovedRef.current = onTableRemoved;
    }, [onTableCreated, onTableRemoved]);

    useEffect(() => {
        if (!enabled) return;
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        if (!token) return;

        const baseUrl = getSocketBaseUrl();
        if (!baseUrl) return;

        const socket: Socket = io(`${baseUrl}/multiplayer`, {
            auth: { token },
            path: '/socket.io',
            transports: ['websocket', 'polling'],
        });

        const onCreated = (payload: TablesCreatedPayload) => {
            if (payload?.table?.ownerId) {
                onCreatedRef.current(payload.table);
            }
        };
        const onRemoved = (payload: TablesRemovedPayload) => {
            if (payload?.ownerId) {
                onRemovedRef.current(payload.ownerId);
            }
        };

        socket.on('tables:created', onCreated);
        socket.on('tables:removed', onRemoved);

        return () => {
            socket.off('tables:created', onCreated);
            socket.off('tables:removed', onRemoved);
            socket.disconnect();
        };
    }, [enabled]);
}
