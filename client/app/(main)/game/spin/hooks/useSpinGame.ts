import { useState, useCallback, useEffect } from 'react';
import { calculateTotalPrice } from '../helpers/calculateTotalPrice';
import { validateRolls } from '../helpers/validateRolls';
import { GiftItem } from '@/entites/gifts/interfaces/giftItem.interface';

interface SpinGameConfig {
    defaultRolls?: number;
    pricePerRoll?: number;
    minRolls?: number;
    maxRolls?: number;
    giftCount?: number;
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
        defaultRolls = 1,
        pricePerRoll = 15,
        minRolls = 1,
        maxRolls,
        giftCount: initialGiftCount = 5,
        rollStep = 1,
    } = config;

    const [rolls, setRolls] = useState(defaultRolls);
    const [isSpinning, setIsSpinning] = useState(false);
    const [giftCount, setGiftCount] = useState(initialGiftCount);
    const [targetIndex, setTargetIndex] = useState<number | null>(null);

    const totalPrice = calculateTotalPrice(rolls, pricePerRoll);
    const canPlay = !isSpinning && validateRolls(rolls, minRolls, maxRolls);

    // Сбрасываем rolls при изменении rollStep (смена валюты)
    useEffect(() => {
        setRolls(defaultRolls);
    }, [rollStep, defaultRolls]);

    // Логируем изменения isSpinning
    useEffect(() => {
        console.log('🎰 useSpinGame: isSpinning изменилось на', isSpinning);
    }, [isSpinning]);

    const handleIncreaseRolls = useCallback(() => {
        if (isSpinning) return;
        setRolls(prev => {
            const newRolls = prev + rollStep;
            if (maxRolls !== undefined && newRolls > maxRolls) {
                return prev;
            }
            return newRolls;
        });
    }, [isSpinning, maxRolls, rollStep]);

    const handleDecreaseRolls = useCallback(() => {
        if (isSpinning) return;
        setRolls(prev => {
            const newRolls = prev - rollStep;
            if (newRolls < minRolls) {
                return prev;
            }
            return newRolls;
        });
    }, [isSpinning, minRolls, rollStep]);

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

