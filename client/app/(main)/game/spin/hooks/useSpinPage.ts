import { useCurrency } from './useCurrency';
import { useGifts } from './useGifts';
import { useGameResult } from './useGameResult';
import { useSpinGame } from './useSpinGame';
import { useMinPrice } from './useMinPrice';
import { useUserStore } from '@/entites/user/model/user';

export const useSpinPage = () => {
    const { currency, toggleCurrency } = useCurrency();
    const { startGame, handleGameComplete } = useGameResult();
    const { user } = useUserStore();
    const { minStakeTon, stepTon, minStakeStars, stepStars } = useMinPrice();

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
        minStake,
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
