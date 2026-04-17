'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import cls from './TablesList.module.scss';
import { TableItem } from '../TableItem/TableItem';
import { multiplayerService, type TableState } from '@/entites/multiplayer/api/api';
import { useTablesLobbySocket } from '@/entites/multiplayer/hooks/useTablesLobbySocket';
import { useUserStore } from '@/entites/user/model/user';
import { TABLE_GLOW_COLORS, TABLE_GIFT_IMAGES, stablePick } from '../../constants/tableVisualPool';

export type TablesCurrencyFilter = 'TON' | 'STARS' | 'ALL';
export type TablesSortBy = 'bet' | 'win' | 'players';
export type TablesSortDir = 'asc' | 'desc';

export interface TablesListFilters {
    currency: TablesCurrencyFilter;
    sortBy: TablesSortBy;
    sortDir: TablesSortDir;
}

function displayUsername(username: string) {
    return username.startsWith('@') ? username : `@${username}`;
}

function normalizeTableCurrencyLabel(c: TableState['currency']): 'TON' | 'STARS' {
    const s = String(c ?? 'TON').toUpperCase();
    return s === 'STARS' || s === 'STAR' ? 'STARS' : 'TON';
}

function mapServerTableToItemProps(table: TableState) {
    const glowColor = stablePick(TABLE_GLOW_COLORS, table.ownerId);
    const giftImage = stablePick(TABLE_GIFT_IMAGES, `${table.ownerId}-gift`);

    const parts = Array.isArray(table.participants) ? table.participants : [];
    const members = parts.map((p) => ({
        id: p.userId,
        name: displayUsername(p.username),
        avatar: p.photoUrl,
    }));

    const cur = normalizeTableCurrencyLabel(table.currency);
    const currencyType = cur === 'TON' ? 'ton' : 'star';

    return {
        id: table.ownerId,
        glowColor,
        giftImage,
        currency: {
            price: table.betAmount,
            type: currencyType as 'ton' | 'star',
        },
        members,
        server: { ...table, currency: cur },
    };
}

function getSortValue(table: TableState, sortBy: TablesSortBy): number {
    if (sortBy === 'players') return table.participants?.length ?? 0;
    if (sortBy === 'win') {
        // "Выигрыш" = банк (ставка * макс игроков) для обеих валют.
        return (table.betAmount ?? 0) * (table.maxPlayers ?? 0);
    }
    // bet
    return table.betAmount ?? 0;
}

const TablesList = ({ filters }: { filters: TablesListFilters }) => {
    const router = useRouter();
    const updateBalance = useUserStore((s) => s.updateBalance);

    const [tables, setTables] = useState<ReturnType<typeof mapServerTableToItemProps>[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const [joiningId, setJoiningId] = useState<string | null>(null);
    const [joinError, setJoinError] = useState<string | null>(null);

    const loadTables = useCallback(async () => {
        setLoading(true);
        setFetchError(null);
        try {
            const res = await multiplayerService.listTables();
            const rows = Array.isArray(res.tables) ? res.tables : [];
            setTables(rows.map(mapServerTableToItemProps));
        } catch {
            setFetchError('Не удалось загрузить столы');
            setTables([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTables();
    }, [loadTables]);

    const upsertTableFromSocket = useCallback((table: TableState) => {
        setTables((prev) => {
            const mapped = mapServerTableToItemProps(table);
            const idx = prev.findIndex((t) => t.id === mapped.id);
            if (idx >= 0) {
                const next = [...prev];
                next[idx] = mapped;
                return next;
            }
            return [...prev, mapped];
        });
    }, []);

    const removeTableFromSocket = useCallback((ownerId: string) => {
        setTables((prev) => prev.filter((t) => t.id !== ownerId));
    }, []);

    useTablesLobbySocket({
        // Не отключаем сокет из‑за единичной ошибки HTTP — иначе новые столы не прилетают в лобби
        enabled: true,
        onTableCreated: upsertTableFromSocket,
        onTableRemoved: removeTableFromSocket,
    });

    const handleDoubleClickJoin = async (
        e: React.MouseEvent,
        ownerId: string,
        betAmount: number,
        currency: 'ton' | 'star',
    ) => {
        e.preventDefault();
        e.stopPropagation();
        if (joiningId) return;
        const uid = useUserStore.getState().user?.userId;
        if (!uid) {
            setJoinError('Войдите в аккаунт');
            return;
        }
        setJoinError(null);
        setJoiningId(ownerId);
        try {
            let wasIn = false;
            try {
                const prev = await multiplayerService.getTable(ownerId);
                wasIn = prev.table.participants.some((p) => p.userId === uid);
            } catch {
                setJoinError('Стол больше не доступен');
                await loadTables();
                return;
            }
            await multiplayerService.joinTable(ownerId);
            if (!wasIn) {
                updateBalance(-betAmount, currency === 'star' ? 'stars' : 'ton');
            }
            router.push(`/table?owner=${encodeURIComponent(ownerId)}`);
        } catch (err: any) {
            const raw = err?.response?.data?.message;
            setJoinError(
                Array.isArray(raw) ? raw.join(', ') : raw ?? 'Не удалось вступить за стол',
            );
        } finally {
            setJoiningId(null);
        }
    };

    if (loading) {
        return (
            <div className={cls.tablesList}>
                <p className={cls.emptyState}>Загрузка столов…</p>
            </div>
        );
    }

    if (fetchError) {
        return (
            <div className={cls.tablesList}>
                <p className={cls.emptyState}>{fetchError}</p>
            </div>
        );
    }

    if (tables.length === 0) {
        return (
            <div className={cls.tablesList}>
                <p className={cls.emptyState}>Пока нет активных столов</p>
            </div>
        );
    }

    const filtered = tables
        .filter((t) => {
            if (filters.currency === 'ALL') return true;
            return t.server.currency === filters.currency;
        })
        .slice()
        .sort((a, b) => {
            const av = getSortValue(a.server, filters.sortBy);
            const bv = getSortValue(b.server, filters.sortBy);
            if (av === bv) return 0;
            const dir = filters.sortDir === 'asc' ? 1 : -1;
            return av < bv ? -1 * dir : 1 * dir;
        });

    if (filtered.length === 0) {
        const curLabel = filters.currency === 'TON' ? 'TON' : 'STARS';
        return (
            <div className={cls.tablesList}>
                <p className={cls.emptyState}>Нет столов для {curLabel}</p>
            </div>
        );
    }

    return (
        <div className={cls.tablesList}>
            {joinError && <p className={cls.joinError}>{joinError}</p>}
            {filtered.map((table) => (
                <div
                    key={table.id}
                    className={cls.tableWrapper}
                    onClick={() => setSelectedTableId(selectedTableId === table.id ? null : table.id)}
                    onDoubleClick={(e) =>
                        handleDoubleClickJoin(e, table.id, table.currency.price, table.currency.type)
                    }
                >
                    <TableItem
                        id={table.id}
                        glowColor={table.glowColor}
                        giftImage={table.giftImage}
                        currency={table.currency}
                        members={table.members}
                        isSelected={selectedTableId === table.id}
                    />
                </div>
            ))}
        </div>
    );
};

export { TablesList };
