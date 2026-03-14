import { useState, useEffect } from 'react';
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
    const [selectedWishName, setSelectedWishName] = useState<string | null>(null);

    const { inventoryGifts, isLoadingGifts, loadGifts } = useInventoryGifts();
    const { chance, bet, winning, poolGifts, isLoadingChance } = useChanceData(
        selectedGifts,
        selectedMultiplier,
    );

    const canSelectWish = bet >= WISH_SELECTION_MIN_BET_TON;

    useEffect(() => {
        setSelectedWishName(null);
    }, [selectedGifts, selectedMultiplier]);

    const onSelectWish = async (name: string) => {
        if (selectedWishName === name) {
            setSelectedWishName(null);
            return;
        }
        try {
            await upgrateService.setWishNft(name);
            setSelectedWishName(name);
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

    const startGame = async () => {
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

        if (outcome === 'win' && gameResult.gifts.length > 0) {
            const mainGift = gameResult.gifts[0];
            eventBus.emit(MODAL_EVENTS.OPEN_WIN_MODAL, {
                selectedItem: {
                    name: mainGift.name ?? 'Подарок',
                    price: mainGift.price,
                    image: mainGift.image,
                },
                rolls: 1,
                totalPrice: bet,
                giftId: mainGift.id,
            });
        }

        // Ставка забрана сервером — сбрасываем выбор и обновляем инвентарь
        setSelectedGifts([]);
        setSelectedWishName(null);
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
        inventoryGifts,
        isLoadingGifts,
        loadGifts,
        chance,
        bet,
        winning,
        poolGifts,
        isLoadingChance,
        canSelectWish,
        selectedWishName,
        onSelectWish,
        startGame,
        gameResult,
        isPlaying,
        handleAnimationComplete,
    };
}
