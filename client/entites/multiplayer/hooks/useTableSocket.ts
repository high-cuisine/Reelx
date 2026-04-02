'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { TableState } from '../api/api';
import { getSocketBaseUrl } from '../lib/socketBaseUrl';

type TableUpdatedPayload = { table: TableState };
type TableDeletedPayload = { ownerId: string };

type JoinTableAck =
    | { success: true; table: TableState }
    | { success: false; error: string };

type GameReadyAck = JoinTableAck;

export interface UseTableSocketOptions {
    ownerId: string | null;
    /** Вызывается при любом актуальном состоянии стола (join, broadcast, disconnect других). */
    onTable: (table: TableState) => void;
    /** Стол удалён (владелец закрыл или последний вышел). */
    onTableDeleted: () => void;
    /** Ошибка ack на game-ready (например, стол не полный). */
    onGameReadyError?: (message: string) => void;
}

export interface UseTableSocketResult {
    connected: boolean;
    socketError: string | null;
    emitGameReady: () => void;
}

/**
 * Подключение к namespace `/multiplayer`: join в комнату стола, события table-updated / table-deleted.
 * При размонтировании — leave-table и disconnect (сервер дополнительно чистит в handleDisconnect).
 */
export function useTableSocket({
    ownerId,
    onTable,
    onTableDeleted,
    onGameReadyError,
}: UseTableSocketOptions): UseTableSocketResult {
    const [connected, setConnected] = useState(false);
    const [socketError, setSocketError] = useState<string | null>(null);

    const onTableRef = useRef(onTable);
    const onTableDeletedRef = useRef(onTableDeleted);
    const onGameReadyErrorRef = useRef(onGameReadyError);
    const socketRef = useRef<Socket | null>(null);
    useLayoutEffect(() => {
        onTableRef.current = onTable;
        onTableDeletedRef.current = onTableDeleted;
        onGameReadyErrorRef.current = onGameReadyError;
    }, [onTable, onTableDeleted, onGameReadyError]);

    const joinTable = useCallback((socket: Socket, oid: string) => {
        socket.emit('join-table', { ownerId: oid }, (ack: JoinTableAck) => {
            if (ack?.success && ack.table) {
                onTableRef.current(ack.table);
                setSocketError(null);
            } else if (ack && 'success' in ack && !ack.success) {
                setSocketError(ack.error ?? 'Не удалось присоединиться к столу');
            }
        });
    }, []);

    const emitGameReady = useCallback(() => {
        const socket = socketRef.current;
        if (!ownerId || !socket?.connected) return;
        socket.emit('game-ready', { ownerId }, (ack: GameReadyAck) => {
            if (ack?.success && ack.table) {
                onTableRef.current(ack.table);
            } else if (ack && 'success' in ack && !ack.success) {
                onGameReadyErrorRef.current?.(ack.error ?? 'Не удалось подтвердить готовность');
            }
        });
    }, [ownerId]);

    useEffect(() => {
        if (!ownerId) return;

        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        if (!token) {
            return;
        }

        const baseUrl = getSocketBaseUrl();
        const socket = io(`${baseUrl}/multiplayer`, {
            auth: { token },
            path: '/socket.io',
            transports: ['websocket', 'polling'],
        });
        socketRef.current = socket;

        const handleConnect = () => {
            setConnected(true);
            setSocketError(null);
            joinTable(socket, ownerId);
        };

        const handleDisconnect = () => {
            setConnected(false);
        };

        const handleTableUpdated = (payload: TableUpdatedPayload) => {
            if (payload?.table) {
                onTableRef.current(payload.table);
            }
        };

        const handleTableDeleted = (payload: TableDeletedPayload) => {
            if (payload?.ownerId === ownerId) {
                onTableDeletedRef.current();
            }
        };

        const handleConnectError = (err: Error) => {
            setSocketError(err.message || 'Ошибка подключения');
            setConnected(false);
        };

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('table-updated', handleTableUpdated);
        socket.on('table-deleted', handleTableDeleted);
        socket.on('connect_error', handleConnectError);

        if (socket.connected) {
            handleConnect();
        }

        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('table-updated', handleTableUpdated);
            socket.off('table-deleted', handleTableDeleted);
            socket.off('connect_error', handleConnectError);

            if (socket.connected) {
                socket.emit('leave-table', { ownerId });
            }
            socket.disconnect();
            socketRef.current = null;
        };
    }, [ownerId, joinTable]);

    return { connected, socketError, emitGameReady };
}
