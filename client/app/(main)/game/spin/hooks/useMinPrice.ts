import { useState, useEffect } from 'react';
import { giftsService, MinPriceResponse } from '@/entites/gifts/api/api';

const STEP_TON = 15;

export const useMinPrice = () => {
    const [minPrice, setMinPrice] = useState<MinPriceResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        const fetchMinPrice = async () => {
            try {
                const data = await giftsService.getMinPrice();
                if (!cancelled) {
                    setMinPrice(data);
                }
            } catch (error) {
                console.error('Failed to fetch min price:', error);
                if (!cancelled) {
                    setMinPrice({ ton: STEP_TON, stars: STEP_TON * 10 });
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        fetchMinPrice();
        return () => {
            cancelled = true;
        };
    }, []);

    const pricePerRollTon = STEP_TON;
    const pricePerRollStarsRaw = minPrice
        ? STEP_TON * (minPrice.stars / minPrice.ton)
        : STEP_TON * 10;
    const pricePerRollStars = Math.ceil(pricePerRollStarsRaw / 100) * 100;

    return {
        minPrice,
        isLoading,
        pricePerRollTon,
        pricePerRollStars,
        stepTon: STEP_TON,
        stepStars: pricePerRollStars,
    };
};
