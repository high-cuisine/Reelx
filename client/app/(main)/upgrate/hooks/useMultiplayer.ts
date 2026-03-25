import { useState } from 'react';
import { multiplayerService, type TableState, type TableCurrency } from '@/entites/multiplayer/api/api';
import { useUserStore } from '@/entites/user/model/user';

export function useMultiplayer() {
    const updateBalance = useUserStore((s) => s.updateBalance);

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
            // Reflect deduction in local store so the header balance updates instantly
            updateBalance(-bet, currency === 'TON' ? 'ton' : 'stars');
        } catch (e: any) {
            const raw = e?.response?.data?.message;
            const msg = Array.isArray(raw)
                ? raw.join(', ')
                : raw ?? 'Ошибка при создании стола';
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const closeTable = async () => {
        setIsLoading(true);
        setError(null);
        // Capture before state is cleared
        const snapshot = table;
        try {
            await multiplayerService.deleteTable();
            setTable(null);
            setBetAmount('');
            // Refund owner's own bet back into local store
            if (snapshot) {
                updateBalance(snapshot.betAmount, snapshot.currency === 'TON' ? 'ton' : 'stars');
            }
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
