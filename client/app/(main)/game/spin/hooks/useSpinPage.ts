import { useCurrency } from './useCurrency';
import { useGifts } from './useGifts';
import { useGameResult } from './useGameResult';
import { useSpinGame } from './useSpinGame';
import { useMinPrice } from './useMinPrice';
import { getModeByTon } from '../helpers/getMode.helper';
import { useUserStore } from '@/entites/user/model/user';
import { updateUserBalance } from '@/features/user/user';

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

    // Пересчитываем totalPrice в TON, чтобы режимы normal/multy/mystery
    // зависели от диапазонов 0–20 / 20–50 / 50+ TON.
    const tonEquivalent =
        currency === 'ton'
            ? totalPrice
            : (minStakeStars > 0 ? (totalPrice * minStakeTon) / minStakeStars : 0);

    const mode = getModeByTon(tonEquivalent);

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

        handlePlayInternal(wheelItems, startGame);

        // Локально уменьшаем баланс пользователя, чтобы Header сразу обновился
        updateUserBalance(
            -totalPrice,
            currency === 'stars' ? 'stars' : 'ton',
        );
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
        mode,
    };
};
