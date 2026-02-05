import { useState, useEffect } from 'react';
import { giftsService, MinPriceResponse } from '@/entites/gifts/api/api';

const MIN_STAKE_TON = 5;
const STEP_TON = 15;
const MIN_STAKE_STARS = 150;
const STEP_STARS = 150;

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
                    setMinPrice({ ton: MIN_STAKE_TON, stars: MIN_STAKE_STARS });
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

    return {
        minPrice,
        isLoading,
        minStakeTon: MIN_STAKE_TON,
        stepTon: STEP_TON,
        minStakeStars: MIN_STAKE_STARS,
        stepStars: STEP_STARS,
    };
};
