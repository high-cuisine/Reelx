import { useState } from 'react';
import { multiplayerService, type TableState, type TableCurrency } from '@/entites/multiplayer/api/api';

export function useMultiplayer() {
    const [currency, setCurrency] = useState<TableCurrency>('TON');
    const [betAmount, setBetAmount] = useState<string>('');
    const [maxPlayers, setMaxPlayers] = useState<number>(4);
    const [table, setTable] = useState<TableState | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createTable = async () => {
        const bet = parseFloat(betAmount);
        if (!bet || bet <= 0) {
            setError('Введите корректную сумму ставки');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const res = await multiplayerService.createTable({ currency, betAmount: bet, maxPlayers });
            setTable(res.table);
        } catch (e: any) {
            const msg =
                e?.response?.data?.message ??
                (Array.isArray(e?.response?.data?.message)
                    ? e.response.data.message.join(', ')
                    : null) ??
                'Ошибка при создании стола';
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const closeTable = async () => {
        setIsLoading(true);
        setError(null);
        try {
            await multiplayerService.deleteTable();
            setTable(null);
            setBetAmount('');
        } catch (e: any) {
            const msg = e?.response?.data?.message ?? 'Ошибка при закрытии стола';
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return {
        currency,
        setCurrency,
        betAmount,
        setBetAmount,
        maxPlayers,
        setMaxPlayers,
        table,
        isLoading,
        error,
        createTable,
        closeTable,
    };
}
