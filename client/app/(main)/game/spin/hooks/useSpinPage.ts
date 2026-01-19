import { useCurrency } from './useCurrency';
import { useGifts } from './useGifts';
import { useGameResult } from './useGameResult';
import { useSpinGame } from './useSpinGame';
import { useUserStore } from '@/entites/user/model/user';

export const useSpinPage = () => {
    const { currency, toggleCurrency } = useCurrency();
    const { startGame, handleGameComplete } = useGameResult();
    const { user } = useUserStore();

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
            defaultRolls: currency === 'stars' ? 5 : 1,
            pricePerRoll: 5,
            minRolls: currency === 'stars' ? 5 : 1,
            giftCount: 1,
            rollStep: currency === 'stars' ? 5 : 1,
        },
        handleGameComplete
    );

    const { wheelItems, isLoadingGifts } = useGifts(currency, totalPrice);

    // Обертка для handlePlay с проверкой баланса и вызовом startGame
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

        handlePlayInternal(wheelItems, startGame);
    };

    return {
        currency,
        toggleCurrency,
        wheelItems,
        isLoadingGifts,
        rolls,
        pricePerRoll,
        totalPrice,
        giftCount,
        isSpinning,
        canPlay,
        handleIncreaseRolls,
        handleDecreaseRolls,
        handlePlay,
        onSpinComplete,
        targetIndex,
    };
};
