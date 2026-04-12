import { useState, useEffect, useMemo } from 'react';
import { eventBus, MODAL_EVENTS } from '@/features/eventBus/eventBus';
import { useInventoryGifts } from './useInventoryGifts';
import { useChanceData } from './useChanceData';
import { upgrateService, type StartGameResponse } from '@/entites/upgrate/api/api';
import { WISH_SELECTION_MIN_BET_TON } from '../helpers/constants';

export type UpgrateTab = 'inventory' | 'wishlist';

export function useUpgratePage() {
    const [activeTab, setActiveTab] = useState<UpgrateTab>('inventory');
    const [selectedMultiplier, setSelectedMultiplier] = useState<string | null>(null);
    const [selectedGifts, setSelectedGifts] = useState<string[]>([]);
    const [gameResult, setGameResult] = useState<StartGameResponse | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showLoseToast, setShowLoseToast] = useState(false);
    const [selectedWishNames, setSelectedWishNames] = useState<string[]>([]);
    const [chanceFromSetWish, setChanceFromSetWish] = useState<number | null>(null);

    const { inventoryGifts, isLoadingGifts, loadGifts } = useInventoryGifts();
    const { chance: chanceFromApi, winning, poolGifts, isLoadingChance, refetchChance } =
        useChanceData(selectedGifts, selectedMultiplier);

    /** Ставка в TON = сумма цен выбранных подарков из инвентаря (не зависит от мультипликатора и отката пула на бэкенде). */
    const selectedStakeTon = useMemo(() => {
        if (selectedGifts.length === 0) return 0;
        const idSet = new Set(selectedGifts);
        return inventoryGifts.reduce((sum, g) => {
            if (!idSet.has(g.id)) return sum;
            return sum + (g.price ?? 0);
        }, 0);
    }, [inventoryGifts, selectedGifts]);

    const chance = chanceFromSetWish ?? chanceFromApi;
    const canSelectWish = selectedStakeTon >= WISH_SELECTION_MIN_BET_TON;

    useEffect(() => {
        if (!showLoseToast) return;
        const timer = setTimeout(() => setShowLoseToast(false), 3500);
        return () => clearTimeout(timer);
    }, [showLoseToast]);

    const selectedWishPrice = useMemo(() => {
        if (selectedWishNames.length === 0 || poolGifts.length === 0) return null;
        let sum = 0;
        let foundAny = false;
        for (const name of selectedWishNames) {
            const g = poolGifts.find((p) => p.pool === 'win' && p.name === name);
            if (g?.price != null) {
                sum += g.price;
                foundAny = true;
            }
        }
        return foundAny ? sum : null;
    }, [poolGifts, selectedWishNames]);

    useEffect(() => {
        setSelectedWishNames([]);
        setChanceFromSetWish(null);
    }, [selectedGifts, selectedMultiplier]);

    const onSelectWish = async (name: string) => {
        const next = selectedWishNames.includes(name)
            ? selectedWishNames.filter((n) => n !== name)
            : [...selectedWishNames, name];

        if (next.length === 0) {
            setSelectedWishNames([]);
            setChanceFromSetWish(null);
            await refetchChance();
            return;
        }

        try {
            const res = await upgrateService.setWishNfts(next);
            setSelectedWishNames(next);
            setChanceFromSetWish(res.chance);
        } catch (e) {
            console.error('Ошибка set-wish-nft:', e);
        }
    };

    const toggleGiftSelection = (giftId: string) => {
        setSelectedGifts((prev) =>
            prev.includes(giftId)
                ? prev.filter((id) => id !== giftId)
                : [...prev, giftId],
        );
        setGameResult(null);
    };

    const toggleMultiplier = (value: string) => {
        setSelectedMultiplier((prev) => (prev === value ? null : value));
        setGameResult(null);
    };

    /** Снять подарок со ставки по «×» — сразу переключаем на вкладку желаемых призов */
    const removeStakeGiftViaX = (giftId: string) => {
        setSelectedGifts((prev) => {
            if (!prev.includes(giftId)) return prev;
            return prev.filter((id) => id !== giftId);
        });
        setGameResult(null);
        setActiveTab('wishlist');
    };

    /** Убрать желаемый приз по «×» */
    const removeWishViaX = async (name: string) => {
        if (!selectedWishNames.includes(name)) return;
        setActiveTab('wishlist');
        await onSelectWish(name);
    };

    /** Сбросить множитель по «×» */
    const clearMultiplierViaX = () => {
        setSelectedMultiplier(null);
        setGameResult(null);
        setActiveTab('wishlist');
    };

    const startGame = async () => {
        setGameResult(null);
        setShowLoseToast(false);
        setIsPlaying(true);
        try {
            const res = await upgrateService.startGame();
            setGameResult(res);
            setActiveTab('wishlist');
        } catch (e) {
            console.error('Ошибка start-game:', e);
            setGameResult(null);
            setIsPlaying(false);
        }
    };

    const handleAnimationComplete = (outcome: 'win' | 'lose') => {
        setIsPlaying(false);

        if (!gameResult || gameResult.result !== outcome) {
            setGameResult(null);
            return;
        }

        if (outcome === 'lose') {
            setShowLoseToast(true);
        }

        if (outcome === 'win' && gameResult.gifts.length > 0) {
            if (gameResult.gifts.length === 1) {
                const mainGift = gameResult.gifts[0];
                eventBus.emit(MODAL_EVENTS.OPEN_WIN_MODAL, {
                    selectedItem: {
                        name: mainGift.name ?? 'Подарок',
                        price: mainGift.price,
                        image: mainGift.image,
                    },
                    rolls: 1,
                    totalPrice: selectedStakeTon,
                    giftId: mainGift.id,
                });
            } else {
                eventBus.emit(MODAL_EVENTS.OPEN_GIFTS_MODAL, {
                    title: 'Вы выиграли!',
                    items: gameResult.gifts.map((g) => ({
                        name: g.name ?? 'Подарок',
                        price: g.price,
                        image: g.image,
                    })),
                });
            }
        }

        // Ставка забрана сервером — сбрасываем выбор и обновляем инвентарь
        setSelectedGifts([]);
        setSelectedWishNames([]);
        setChanceFromSetWish(null);
        setActiveTab('inventory');
        loadGifts();

        setGameResult(null);
    };

    return {
        activeTab,
        setActiveTab,
        selectedMultiplier,
        selectedGifts,
        toggleMultiplier,
        toggleGiftSelection,
        removeStakeGiftViaX,
        removeWishViaX,
        clearMultiplierViaX,
        inventoryGifts,
        isLoadingGifts,
        loadGifts,
        chance,
        bet: selectedStakeTon,
        winning,
        selectedWishPrice,
        poolGifts,
        isLoadingChance,
        canSelectWish,
        selectedWishNames,
        onSelectWish,
        startGame,
        gameResult,
        isPlaying,
        showLoseToast,
        clearLoseToast: () => setShowLoseToast(false),
        handleAnimationComplete,
    };
}
