'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import cls from './Table.module.scss';

import { multiplayerService, type TableState } from '@/entites/multiplayer/api/api';
import { useTableSocket } from '@/entites/multiplayer/hooks/useTableSocket';

import { TableInfo, TablePlayButton, TableVisual } from './components';
import { SEAT_POSITIONS } from './components/constants';
import {
    mapTableStateToVisualPlayers,
    tableCurrencyToUi,
    tableWheelStatusText,
} from './mapTablePlayers';

const FALLBACK_POLL_MS = 12000;

export default function TablePage() {
    const searchParams = useSearchParams();
    const ownerId = searchParams.get('owner');

    const [table, setTable] = useState<TableState | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [bootLoading, setBootLoading] = useState(true);
    const firstLoadRef = useRef(true);

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
        fetchTable();
    }, [ownerId, fetchTable]);

    const { connected: socketConnected } = useTableSocket({
        ownerId,
        onTable: setTable,
        onTableDeleted: () => {
            setLoadError('Стол закрыт');
            setTable(null);
        },
    });

    /** Если сокет не поднялся, редко подтягиваем состав с REST. */
    useEffect(() => {
        if (!ownerId || socketConnected) return;
        const t = setInterval(fetchTable, FALLBACK_POLL_MS);
        return () => clearInterval(t);
    }, [ownerId, socketConnected, fetchTable]);

    const players = useMemo(() => (table ? mapTableStateToVisualPlayers(table) : []), [table]);
    const seatsPlayers = useMemo(
        () => players.slice(0, SEAT_POSITIONS.length),
        [players],
    );
    const uiCurrency = table ? tableCurrencyToUi(table) : 'ton';
    const gameId = ownerId ? `#${ownerId.slice(0, 8)}` : '#—';
    const hashShort = ownerId
        ? `${ownerId.slice(0, 6)}…${ownerId.slice(-4)}`
        : '—';

    const handleCopyHash = () => {
        if (ownerId) navigator.clipboard.writeText(ownerId);
    };

    if (!ownerId) {
        return (
            <div className={cls.page}>
                <p className={cls.fallbackText}>Выберите стол в списке или создайте свой.</p>
                <Link href="/game" className={cls.fallbackLink}>
                    К списку столов
                </Link>
            </div>
        );
    }

    if (bootLoading) {
        return (
            <div className={cls.page}>
                <p className={cls.fallbackText}>Загрузка стола…</p>
            </div>
        );
    }

    if (loadError || !table) {
        return (
            <div className={cls.page}>
                <p className={cls.fallbackText}>{loadError ?? 'Стол недоступен'}</p>
                <Link href="/game" className={cls.fallbackLink}>
                    К списку столов
                </Link>
            </div>
        );
    }

    return (
        <div className={cls.page}>
           

            <TableVisual
                players={seatsPlayers}
                statusText={tableWheelStatusText(table)}
            />

            <TablePlayButton stake={table.betAmount} currency={uiCurrency} />

            <TableInfo
                players={players}
                gameId={gameId}
                hash={hashShort}
                currency={uiCurrency}
                onCopyHash={handleCopyHash}
            />
        </div>
    );
}
