import { useState, useEffect } from 'react';
import { userService, UserGift } from '@/entites/user/api/api';

export const useInventory = () => {
    const [activeTab, setActiveTab] = useState<'inventory' | 'history'>('history');
    const [gifts, setGifts] = useState<UserGift[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadGifts = async () => {
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
    }, []);

    const historyGifts = gifts;
    const inventoryGifts = gifts.filter(gift => !gift.isOut);

    return {
        activeTab,
        setActiveTab,
        historyGifts,
        inventoryGifts,
        isLoading,
    };
};
