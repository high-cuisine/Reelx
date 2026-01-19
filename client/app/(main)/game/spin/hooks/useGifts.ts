import { useState, useEffect } from 'react';
import { GiftItem } from '@/entites/gifts/interfaces/giftItem.interface';
import { giftsService } from '@/entites/gifts/api/api';
import { CurrencyType } from './useCurrency';

export const useGifts = (currency: CurrencyType, amount?: number) => {
    const [wheelItems, setWheelItems] = useState<GiftItem[]>([]);
    const [isLoadingGifts, setIsLoadingGifts] = useState(false);

    useEffect(() => {
        const loadGifts = async () => {
            setIsLoadingGifts(true);
            try {
                const gifts = await giftsService.getGiftsByPrice({
                    amount: amount || 0,
                    type: currency,
                });
                setWheelItems(gifts);
            } catch (error) {
                console.error('Ошибка загрузки подарков:', error);
                setWheelItems([]);
            } finally {
                setIsLoadingGifts(false);
            }
        };

        loadGifts();
    }, [currency, amount]);

    return {
        wheelItems,
        isLoadingGifts,
    };
};
