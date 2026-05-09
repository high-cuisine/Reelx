import { useCurrency } from './useCurrency';
import { useGifts } from './useGifts';
import { useGameResult } from './useGameResult';
import { useSpinGame } from './useSpinGame';
import { useMinPrice } from './useMinPrice';
import { useUserStore } from '@/entites/user/model/user';
import { updateUserBalance } from '@/features/user/user';
import { useEffect, useState } from 'react';

export const useSpinPage = () => {
    const { currency, toggleCurrency } = useCurrency();
    const { startGame, handleGameComplete } = useGameResult();
    const { user } = useUserStore();
    const { minStakeTon, stepTon, minStakeStars, stepStars } = useMinPrice();
    const [moneyWinToast, setMoneyWinToast] = useState<{
        currency: 'ton' | 'stars';
        amount: number;
    } | null>(null);

    useEffect(() => {
        if (!moneyWinToast) return;
        const t = setTimeout(() => setMoneyWinToast(null), 3500);
        return () => clearTimeout(t);
    }, [moneyWinToast]);

    const minStake = currency === 'ton' ? minStakeTon : minStakeStars;
    const step = currency === 'ton' ? stepTon : stepStars;

    const {
        rolls,
        pricePerRoll,
        totalPrice,
        giftCount,
        isSpinning,
        canPlay,
        handleIncreaseRolls,
        handleDecreaseRolls,
        handlePlay: handlePlayInternal,
        onSpinComplete,
        targetIndex,
    } = useSpinGame(
        {
            minStake,
            step,
            giftCount: 1,
        },
        (result) => {
            const isMoneyWin = result.selectedItem.name === 'TON' || result.selectedItem.name === 'STARS';
            if (isMoneyWin) {
                const amount = result.selectedItem.price ?? 0;
                const winCurrency = result.selectedItem.name === 'TON' ? 'ton' : 'stars';
                if (amount > 0) {
                    setMoneyWinToast({ currency: winCurrency, amount });
                }
            }
            handleGameComplete(result, currency);
        }
    );

    const { wheelItems, isLoadingGifts } = useGifts(currency, totalPrice);

    // Обертка для handlePlay с проверкой баланса, запуском игры и обновлением баланса в сторе
    const handlePlay = () => {
        // Проверяем баланс перед началом игры
        if (!user) {
            alert('Ошибка: пользователь не авторизован');
            return;
        }

        const userBalance = currency === 'stars' 
            ? (user.starsBalance || 0) 
            : (user.tonBalance || 0);

        if (userBalance < totalPrice) {
            const currencyName = currency === 'stars' ? 'STARS' : 'TON';
            alert(
                `Недостаточный баланс!\n` +
                `Требуется: ${totalPrice} ${currencyName}\n` +
                `Доступно: ${userBalance} ${currencyName}`
            );
            return;
        }

        if (isLoadingGifts || wheelItems.length === 0) {
            alert('Подождите, колесо ещё загружается');
            return;
        }

        const p = handlePlayInternal(wheelItems, startGame);

        // Локально уменьшаем баланс пользователя, чтобы Header сразу обновился
        updateUserBalance(
            -totalPrice,
            currency === 'stars' ? 'stars' : 'ton',
        );

        return p;
    };

    return {
        currency,
        toggleCurrency,
        wheelItems,
        isLoadingGifts,
        rolls,
        pricePerRoll,
        totalPrice,
        minStake,
        giftCount,
        isSpinning,
        canPlay,
        handleIncreaseRolls,
        handleDecreaseRolls,
        handlePlay,
        onSpinComplete,
        targetIndex,
        moneyWinToast,
        clearMoneyWinToast: () => setMoneyWinToast(null),
    };
};
