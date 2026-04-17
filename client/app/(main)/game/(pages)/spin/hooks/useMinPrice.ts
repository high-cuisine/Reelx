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
                const ton = Number(tonPrice);
                const star = Number(starPrice);

                const baseTonStake = 5;
                const tonStep = 5;

                const starsPerTon =
                    Number.isFinite(ton) && ton > 0 && Number.isFinite(star) && star > 0
                        ? ton / star
                        : 50;
                const baseStarsRaw = baseTonStake * starsPerTon;
                const roundedStars = Math.ceil(baseStarsRaw / 100) * 100;
                const baseStars =
                    Number.isFinite(roundedStars) && roundedStars > 0 ? roundedStars : 100;

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
