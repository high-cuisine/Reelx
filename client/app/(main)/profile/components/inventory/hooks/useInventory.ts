import { useState, useEffect } from 'react';
import { userService, UserGift } from '@/entites/user/api/api';
import { useUserStore } from '@/entites/user/model/user';

export const useInventory = () => {
    const [activeTab, setActiveTab] = useState<'inventory' | 'history'>('inventory');
    const [gifts, setGifts] = useState<UserGift[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user, games } = useUserStore();

    useEffect(() => {
        const loadGifts = async () => {
            if (!user) {
                setGifts([]);
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                const userGifts = await userService.getUserGifts();
                setGifts(userGifts);
            } catch (error) {
                console.error('Ошибка загрузки подарков:', error);
                setGifts([]);
            } finally {
                setIsLoading(false);
            }
        };

        loadGifts();
    }, [user?.userId]);

    const historyGames = games ?? [];
    const inventoryGifts = gifts.filter(gift => !gift.isOut);

    return {
        activeTab,
        setActiveTab,
        historyGames,
        inventoryGifts,
        isLoading,
    };
};
