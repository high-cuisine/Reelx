import { useState, useCallback, useEffect } from 'react';
import { GiftItem } from '@/entites/gifts/interfaces/giftItem.interface';

interface SpinGameConfig {
    /** Уровни ставки по возрастанию (кнопки + / − переключают между ними) */
    stakeTiers?: number[];
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
    maxStake: number;
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
        stakeTiers: stakeTiersProp,
        giftCount: initialGiftCount = 5,
    } = config;

    const stakeTiers = stakeTiersProp?.length ? stakeTiersProp : [1, 5, 10, 15, 20];

    const tiers = stakeTiers;
    const minStake = tiers[0];
    const maxStake = tiers[tiers.length - 1];

    const [stake, setStake] = useState(minStake);
    const [isSpinning, setIsSpinning] = useState(false);
    const [giftCount, setGiftCount] = useState(initialGiftCount);
    const [targetIndex, setTargetIndex] = useState<number | null>(null);

    const totalPrice = stake;
    const rolls = 1;
    const pricePerRoll = stake;
    const canPlay = !isSpinning && stake >= minStake;

    useEffect(() => {
        const t = stakeTiers.length > 0 ? stakeTiers : [1];
        const first = t[0];
        setStake((prev: number) => {
            if (t.includes(prev)) return prev;
            let best = first;
            for (const x of t) {
                if (x <= prev) best = x;
                else break;
            }
            return best;
        });
    }, [stakeTiers]);

    const handleIncreaseRolls = useCallback(() => {
        if (isSpinning) return;
        setStake((prev: number) => {
            const next = tiers.find((x) => x > prev);
            return next ?? prev;
        });
    }, [isSpinning, tiers]);

    const handleDecreaseRolls = useCallback(() => {
        if (isSpinning) return;
        setStake((prev: number) => {
            let best = tiers[0];
            for (const x of tiers) {
                if (x < prev) best = x;
                else break;
            }
            return best;
        });
    }, [isSpinning, tiers]);

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
        maxStake,
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

