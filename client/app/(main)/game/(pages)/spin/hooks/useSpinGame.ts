import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { GiftItem } from '@/entites/gifts/interfaces/giftItem.interface';
import {
    findStakeTierIndex,
    mapStakeToCurrency,
    STAKE_TIERS_TON,
    type StakeCurrency,
} from '../constants/stakeTiers';

interface SpinGameConfig {
    /** Уровни ставки по возрастанию (кнопки + / − переключают между ними) */
    stakeTiers?: number[];
    /** Валюта ставки — для переключения TON ↔ Stars по индексу тира */
    currency?: StakeCurrency;
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
        currency = 'ton',
        giftCount: initialGiftCount = 5,
    } = config;

    const stakeTiers = stakeTiersProp?.length ? stakeTiersProp : [...STAKE_TIERS_TON];

    const tiers = useMemo(() => stakeTiers, [stakeTiers]);
    const minStake = tiers[0];
    const maxStake = tiers[tiers.length - 1];

    const [stake, setStake] = useState(minStake);
    const [isSpinning, setIsSpinning] = useState(false);
    const [giftCount, setGiftCount] = useState(initialGiftCount);
    const [targetIndex, setTargetIndex] = useState<number | null>(null);

    const totalPrice = stake;
    const rolls = 1;
    const pricePerRoll = stake;
    const canPlay = !isSpinning && findStakeTierIndex(tiers, stake) >= 0;

    const prevCurrencyRef = useRef<StakeCurrency>(currency);

    useEffect(() => {
        if (prevCurrencyRef.current === currency) return;
        setStake((prev: number) =>
            mapStakeToCurrency(prev, prevCurrencyRef.current, currency),
        );
        prevCurrencyRef.current = currency;
    }, [currency]);

    useEffect(() => {
        const t = stakeTiers.length > 0 ? stakeTiers : [...STAKE_TIERS_TON];
        setStake((prev: number) => {
            if (findStakeTierIndex(t, prev) >= 0) return prev;
            return t[0];
        });
    }, [stakeTiers]);

    const handleIncreaseRolls = useCallback(() => {
        if (isSpinning) return;
        setStake((prev: number) => {
            const idx = findStakeTierIndex(tiers, prev);
            if (idx < 0 || idx >= tiers.length - 1) return prev;
            return tiers[idx + 1];
        });
    }, [isSpinning, tiers]);

    const handleDecreaseRolls = useCallback(() => {
        if (isSpinning) return;
        setStake((prev: number) => {
            const idx = findStakeTierIndex(tiers, prev);
            if (idx <= 0) return tiers[0];
            return tiers[idx - 1];
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

