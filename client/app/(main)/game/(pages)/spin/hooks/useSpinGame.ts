import { useState, useCallback, useEffect } from 'react';
import { GiftItem } from '@/entites/gifts/interfaces/giftItem.interface';

interface SpinGameConfig {
    /** Минимальная ставка (старт) */
    minStake?: number;
    /** Шаг изменения ставки при + / - */
    step?: number;
    giftCount?: number;
    /** @deprecated используется minStake/step */
    defaultRolls?: number;
    /** @deprecated stake = totalPrice */
    pricePerRoll?: number;
    minRolls?: number;
    maxRolls?: number;
    rollStep?: number;
}

interface SpinGameResult {
    selectedItem: GiftItem;
    rolls: number;
    totalPrice: number;
}

interface UseSpinGameReturn {
    rolls: number;
    pricePerRoll: number;
    totalPrice: number;
    giftCount: number;
    isSpinning: boolean;
    canPlay: boolean;
    handleIncreaseRolls: () => void;
    handleDecreaseRolls: () => void;
    handlePlay: (wheelItems: GiftItem[], startGame: (items: GiftItem[]) => Promise<number | null>) => Promise<void>;
    onSpinComplete: (selectedItem: GiftItem) => void;
    setGiftCount: (count: number) => void;
    targetIndex: number | null;
}

export const useSpinGame = (
    config: SpinGameConfig = {},
    onGameComplete?: (result: SpinGameResult) => void
): UseSpinGameReturn => {
    const {
        minStake = 5,
        step = 15,
        giftCount: initialGiftCount = 5,
    } = config;

    const [stake, setStake] = useState(minStake);
    const [isSpinning, setIsSpinning] = useState(false);
    const [giftCount, setGiftCount] = useState(initialGiftCount);
    const [targetIndex, setTargetIndex] = useState<number | null>(null);

    const totalPrice = stake;
    const rolls = 1;
    const pricePerRoll = stake;
    const canPlay = !isSpinning && stake >= minStake;

    useEffect(() => {
        setStake(minStake);
    }, [minStake]);

    const handleIncreaseRolls = useCallback(() => {
        if (isSpinning) return;
        setStake(prev => prev + step);
    }, [isSpinning, step]);

    const handleDecreaseRolls = useCallback(() => {
        if (isSpinning) return;
        setStake(prev => Math.max(minStake, prev - step));
    }, [isSpinning, minStake, step]);

    const handlePlay = useCallback(async (
        wheelItems: GiftItem[],
        startGame: (items: GiftItem[]) => Promise<number | null>
    ) => {
        if (!canPlay || wheelItems.length === 0) return;
        
        console.log('🎮 handlePlay: Начало игры, запрашиваем результат с сервера');
        
        // Получаем целевой индекс с сервера
        const index = await startGame(wheelItems);
        
        if (index === null) {
            console.error('Не удалось получить результат игры с сервера');
            return;
        }
        
        setTargetIndex(index);
        console.log(`🎯 handlePlay: Устанавливаем целевой индекс: ${index}`);
        
        // Запускаем спин
        setIsSpinning(true);
    }, [canPlay]);

    const onSpinComplete = useCallback((selectedItem: GiftItem) => {
        console.log('✅ onSpinComplete: Завершение спина, устанавливаем isSpinning = false', selectedItem);
        setIsSpinning(false);
        setTargetIndex(null); // Сбрасываем целевой индекс после завершения
        
        const result: SpinGameResult = {
            selectedItem,
            rolls,
            totalPrice,
        };

        if (onGameComplete) {
            onGameComplete(result);
        }
    }, [rolls, totalPrice, onGameComplete]);

    return {
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
        setGiftCount,
        targetIndex,
    };
};

