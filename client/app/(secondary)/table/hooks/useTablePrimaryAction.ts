'use client';

import { useMemo } from 'react';
import type { TableGameState, TableState } from '@/entites/multiplayer/api/api';
import {
    resolveTablePrimaryAction,
    type TablePrimaryAction,
} from '../helpers/tableActionState';

export function useTablePrimaryAction(
    table: TableState | null,
    game: TableGameState | null,
    myUserId: string | null,
): TablePrimaryAction | null {
    return useMemo(() => {
        if (!table || !game) return null;
        return resolveTablePrimaryAction(table, game, myUserId);
    }, [table, game, myUserId]);
}
