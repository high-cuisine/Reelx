'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import cls from './Table.module.scss';
import playCls from './components/TablePlayButton.module.scss';

import { multiplayerService, type TableState } from '@/entites/multiplayer/api/api';
import { useTableSocket } from '@/entites/multiplayer/hooks/useTableSocket';
import { useUserStore } from '@/entites/user/model/user';

import { TableInfo, TableVisual } from './components';
import {
    defaultTableGameClient,
    mapTableStateToVisualPlayers,
    orderedPlayersByUserIds,
    tableCurrencyToUi,
    tableDrumCenterText,
} from './mapTablePlayers';

const FALLBACK_POLL_MS = 12000;

export default function TablePage() {
    const searchParams = useSearchParams();
    const ownerId = searchParams.get('owner');
    const myUserId = useUserStore((s) => s.user?.userId ?? null);

    const [table, setTable] = useState<TableState | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [bootLoading, setBootLoading] = useState(true);
    const [readyErr, setReadyErr] = useState<string | null>(null);
    const firstLoadRef = useRef(true);

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
        fetchTable();
    }, [ownerId, fetchTable]);

    const { connected: socketConnected, emitGameReady } = useTableSocket({
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
        const t = setInterval(fetchTable, FALLBACK_POLL_MS);
        return () => clearInterval(t);
    }, [ownerId, socketConnected, fetchTable]);

    // All participants as visual players (for seats around the table)
    const players = useMemo(
        () => (table ? mapTableStateToVisualPlayers(table) : []),
        [table],
    );

    const game = useMemo(
        () => (table ? defaultTableGameClient(table) : null),
        [table],
    );

    // Players on the drum (only those still active)
    const drumPlayers = useMemo(() => {
        if (!table || !game) return [];
        return orderedPlayersByUserIds(players, game.activeUserIds);
    }, [table, game, players]);

    // Set of eliminated user IDs (in participants, but not in activeUserIds)
    const eliminatedUserIds = useMemo<Set<string>>(() => {
        if (!game) return new Set();
        const activeSet = new Set(game.activeUserIds);
        return new Set(
            (table?.participants ?? [])
                .map((p) => p.userId)
                .filter((id) => !activeSet.has(id)),
        );
    }, [game, table]);

    const centerText = useMemo(
        () => (table && game ? tableDrumCenterText(table, game) : '—'),
        [table, game],
    );

    const uiCurrency = table ? tableCurrencyToUi(table) : 'ton';
    const gameId = ownerId ? `#${ownerId.slice(0, 8)}` : '#—';
    const hashShort = ownerId
        ? `${ownerId.slice(0, 6)}…${ownerId.slice(-4)}`
        : '—';

    const handleCopyHash = () => {
        if (ownerId) navigator.clipboard.writeText(ownerId);
    };

    const actionButton = useMemo(() => {
        if (!table || !game) return null;
        const full = table.participants.length === table.maxPlayers;
        const myReady = myUserId ? game.readyUserIds.includes(myUserId) : false;

        if (!myUserId) {
            return <p className={cls.actionHint}>Войдите в аккаунт</p>;
        }
        if (game.phase === 'finished') {
            return (
                <button type="button" className={playCls.playButton} disabled>
                    Игра окончена
                </button>
            );
        }
        if (game.phase === 'playing') {
            return (
                <button type="button" className={playCls.playButton} disabled>
                    Идёт розыгрыш…
                </button>
            );
        }
        if (!full) {
            return (
                <button type="button" className={playCls.playButton} disabled>
                    Ждём игроков ({table.participants.length}/{table.maxPlayers})
                </button>
            );
        }
        if (myReady) {
            return (
                <button type="button" className={playCls.playButton} disabled>
                    Ожидаем остальных…
                </button>
            );
        }
        return (
            <button
                type="button"
                className={playCls.playButton}
                onClick={() => {
                    setReadyErr(null);
                    emitGameReady();
                }}
            >
                Готов
            </button>
        );
    }, [table, game, myUserId, emitGameReady]);

    // ── Guards ────────────────────────────────────────────────────────────────

    if (!ownerId) {
        return (
            <div className={cls.page}>
                <p className={cls.fallbackText}>Выберите стол в списке или создайте свой.</p>
                <Link href="/game" className={cls.fallbackLink}>К списку столов</Link>
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

    if (loadError || !table || !game) {
        return (
            <div className={cls.page}>
                <p className={cls.fallbackText}>{loadError ?? 'Стол недоступен'}</p>
                <Link href="/game" className={cls.fallbackLink}>К списку столов</Link>
            </div>
        );
    }

    return (
        <div className={cls.page}>
            <TableVisual
                seatPlayers={players}
                drumPlayers={drumPlayers}
                centerText={centerText}
                highlightSectorIndex={game.lastEliminatedSectorIndex}
                myUserId={myUserId}
                eliminatedUserIds={eliminatedUserIds}
            />

            {readyErr && <p className={cls.readyError}>{readyErr}</p>}
            {actionButton}

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
