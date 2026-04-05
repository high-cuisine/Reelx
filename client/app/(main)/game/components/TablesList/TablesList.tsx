'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import cls from './TablesList.module.scss';
import { TableItem } from '../TableItem/TableItem';
import { multiplayerService, type TableState } from '@/entites/multiplayer/api/api';
import { useUserStore } from '@/entites/user/model/user';
import { TABLE_GLOW_COLORS, TABLE_GIFT_IMAGES, stablePick } from '../../constants/tableVisualPool';

function displayUsername(username: string) {
    return username.startsWith('@') ? username : `@${username}`;
}

function mapServerTableToItemProps(table: TableState) {
    const glowColor = stablePick(TABLE_GLOW_COLORS, table.ownerId);
    const giftImage = stablePick(TABLE_GIFT_IMAGES, `${table.ownerId}-gift`);

    const members = table.participants.map((p) => ({
        id: p.userId,
        name: displayUsername(p.username),
        avatar: p.photoUrl,
    }));

    const currencyType = table.currency === 'TON' ? 'ton' : 'star';

    return {
        id: table.ownerId,
        glowColor,
        giftImage,
        currency: {
            price: table.betAmount,
            type: currencyType as 'ton' | 'star',
        },
        members,
    };
}

const TablesList = () => {
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
            setTables(res.tables.map(mapServerTableToItemProps));
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

    return (
        <div className={cls.tablesList}>
            {joinError && <p className={cls.joinError}>{joinError}</p>}
            {tables.map((table) => (
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
