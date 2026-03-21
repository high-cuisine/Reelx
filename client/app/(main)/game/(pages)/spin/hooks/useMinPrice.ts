import { useState, useEffect } from 'react';
import { getCurrancyPrice } from '../helpers/getCurrencyPrice.helper';

export const useMinPrice = () => {
    const [minStakeTon, setMinStakeTon] = useState<number>(5);
    const [stepTon, setStepTon] = useState<number>(5);
    const [minStakeStars, setMinStakeStars] = useState<number>(100);
    const [stepStars, setStepStars] = useState<number>(100);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        const fetchRatesAndCalc = async () => {
            try {
                const rates = await getCurrancyPrice();
                if (!rates || !rates.tonPrice || !rates.starPrice) {
                    throw new Error('Invalid currency rates');
                }

                const { tonPrice, starPrice } = rates;

                const baseTonStake = 5;
                const tonStep = 5;

                const starsPerTon = tonPrice / starPrice;
                const baseStarsRaw = baseTonStake * starsPerTon;
                const baseStars = Math.ceil(baseStarsRaw / 100) * 100 || 100;

                if (!cancelled) {
                    setMinStakeTon(baseTonStake);
                    setStepTon(tonStep);
                    setMinStakeStars(baseStars);
                    setStepStars(baseStars);
                }
            } catch (error) {
                console.error('Failed to fetch currency price for bets:', error);
                if (!cancelled) {
                    setMinStakeTon(5);
                    setStepTon(5);
                    setMinStakeStars(100);
                    setStepStars(100);
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        fetchRatesAndCalc();
        return () => {
            cancelled = true;
        };
    }, []);

    return {
        isLoading,
        minStakeTon,
        stepTon,
        minStakeStars,
        stepStars,
    };
};
