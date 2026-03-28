'use client';

import React, { useCallback, useEffect, useState } from 'react';
import cls from './TablesList.module.scss';
import { TableItem } from '../TableItem/TableItem';
import { multiplayerService, type TableState } from '@/entites/multiplayer/api/api';
import {
    TABLE_GLOW_COLORS,
    TABLE_GIFT_IMAGES,
    TABLE_PLACEHOLDER_NAMES,
    stablePick,
} from '../../constants/tableVisualPool';

function mapServerTableToItemProps(table: TableState) {
    const glowColor = stablePick(TABLE_GLOW_COLORS, table.ownerId);
    const giftImage = stablePick(TABLE_GIFT_IMAGES, `${table.ownerId}-gift`);

    const members = table.participants.map((userId, index) => ({
        id: userId,
        name: stablePick(TABLE_PLACEHOLDER_NAMES, `${table.ownerId}-${userId}-${index}`),
        avatar: null as string | null,
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
    const [tables, setTables] = useState<ReturnType<typeof mapServerTableToItemProps>[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

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
            {tables.map((table) => (
                <div
                    key={table.id}
                    className={cls.tableWrapper}
                    onClick={() => setSelectedTableId(selectedTableId === table.id ? null : table.id)}
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
