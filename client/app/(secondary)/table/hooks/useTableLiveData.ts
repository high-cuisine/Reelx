'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { multiplayerService, type TableState } from '@/entites/multiplayer/api/api';
import { useTableSocket } from '@/entites/multiplayer/hooks/useTableSocket';
import { TABLE_FALLBACK_POLL_MS } from './constants';

export function useTableLiveData(ownerId: string | null) {
    const [table, setTable] = useState<TableState | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [bootLoading, setBootLoading] = useState(true);
    const [readyErr, setReadyErr] = useState<string | null>(null);
    const firstLoadRef = useRef(true);

    const clearReadyErr = useCallback(() => setReadyErr(null), []);

    const onGameReadyError = useCallback((message: string) => {
        setReadyErr(message);
    }, []);

    const fetchTable = useCallback(async () => {
        if (!ownerId) return;
        const isFirst = firstLoadRef.current;
        try {
            const res = await multiplayerService.getTable(ownerId);
            setTable(res.table);
            setLoadError(null);
        } catch {
            if (isFirst) {
                setLoadError('Стол не найден или закрыт');
                setTable(null);
            }
        } finally {
            if (isFirst) {
                firstLoadRef.current = false;
                setBootLoading(false);
            }
        }
    }, [ownerId]);

    useEffect(() => {
        if (!ownerId) return;
        firstLoadRef.current = true;
        setBootLoading(true);
        setTable(null);
        setLoadError(null);
        setReadyErr(null);
        void fetchTable();
    }, [ownerId, fetchTable]);

    const { connected: socketConnected, emitGameReady, leaveTableNow } = useTableSocket({
        ownerId,
        onTable: setTable,
        onTableDeleted: () => {
            setLoadError('Стол закрыт');
            setTable(null);
        },
        onGameReadyError,
    });

    useEffect(() => {
        if (!ownerId || socketConnected) return;
        const t = setInterval(() => void fetchTable(), TABLE_FALLBACK_POLL_MS);
        return () => clearInterval(t);
    }, [ownerId, socketConnected, fetchTable]);

    return {
        table,
        loadError,
        bootLoading,
        readyErr,
        emitGameReady,
        leaveTableNow,
        socketConnected,
        clearReadyErr,
    };
}
