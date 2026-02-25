import { useState, useEffect } from 'react';
import { GiftItem } from '@/entites/gifts/interfaces/giftItem.interface';
import { giftsService } from '@/entites/gifts/api/api';
import { CurrencyType } from './useCurrency';

export const useGifts = (currency: CurrencyType, amount?: number) => {
    const [wheelItems, setWheelItems] = useState<GiftItem[]>([]);
    const [isLoadingGifts, setIsLoadingGifts] = useState(false);

    useEffect(() => {
        let isCancelled = false;

        const loadGifts = async () => {
            setIsLoadingGifts(true);

            const maxAttempts = 6;
            let attempt = 0;

            while (attempt < maxAttempts && !isCancelled) {
                try {
                    const gifts = await giftsService.getGiftsByPrice({
                        amount: amount || 0,
                        type: currency,
                    });

                    if (isCancelled) {
                        return;
                    }

                    setWheelItems(gifts);
                    break;
                } catch (error: any) {
                    const status = error?.response?.status;
                    const is40xError =
                        typeof status === 'number' && status >= 400 && status < 500;

                    attempt += 1;

                    if (!is40xError || attempt >= maxAttempts) {
                        console.error('Ошибка загрузки подарков:', error);
                        if (!isCancelled) {
                            setWheelItems([]);
                        }
                        break;
                    }

                    await new Promise((resolve) => setTimeout(resolve, 1000));
                }
            }

            if (!isCancelled) {
                setIsLoadingGifts(false);
            }
        };

        loadGifts();

        return () => {
            isCancelled = true;
        };
    }, [currency, amount]);

    return {
        wheelItems,
        isLoadingGifts,
    };
};
