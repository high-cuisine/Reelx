'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import cls from './Table.module.scss';

import TonIcon from '@/assets/ton.svg';
import StarIcon from '@/assets/star.svg';
import { multiplayerService, type TableState } from '@/entites/multiplayer/api/api';

import { TableInfo, TablePlayButton, TableVisual } from './components';
import { SEAT_POSITIONS } from './components/constants';
import {
    bankTotal,
    mapTableStateToVisualPlayers,
    tableCurrencyToUi,
} from './mapTablePlayers';

const POLL_MS = 3000;

function BankBadge({ amount, currency }: { amount: number; currency: 'ton' | 'star' }) {
    const Icon = currency === 'ton' ? TonIcon : StarIcon;
    return (
        <div className={cls.bank}>
            <span className={cls.bankLabel}>Банк</span>
            <span className={cls.bankAmount}>{amount.toFixed(2)}</span>
            <Image src={Icon} alt="" width={15} height={15} />
        </div>
    );
}

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
        const t = setInterval(fetchTable, POLL_MS);
        return () => clearInterval(t);
    }, [ownerId, fetchTable]);

    const players = useMemo(() => (table ? mapTableStateToVisualPlayers(table) : []), [table]);
    const seatsPlayers = useMemo(
        () => players.slice(0, SEAT_POSITIONS.length),
        [players],
    );
    const uiCurrency = table ? tableCurrencyToUi(table) : 'ton';
    const bank = table ? bankTotal(table) : 0;
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
            <BankBadge amount={bank} currency={uiCurrency} />

            <TableVisual players={seatsPlayers} />

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
