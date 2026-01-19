import { useCurrency } from './useCurrency';
import { useGifts } from './useGifts';
import { useGameResult } from './useGameResult';
import { useSpinGame } from './useSpinGame';

export const useSpinPage = () => {
    const { currency, toggleCurrency } = useCurrency();
    const { startGame, handleGameComplete } = useGameResult();

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

    // Обертка для handlePlay с вызовом startGame
    const handlePlay = () => {
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
