import { useEffect, useState } from 'react';
import { giftsService } from '@/entites/gifts/api/api';
import {
    STAKE_TIERS_STARS,
    STAKE_TIERS_TON,
} from '../constants/stakeTiers';

export const useMinPrice = () => {
    const [minStakeTon, setMinStakeTon] = useState<number>(STAKE_TIERS_TON[0]);
    const [minStakeStars, setMinStakeStars] = useState<number>(STAKE_TIERS_STARS[0]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        giftsService
            .getMinPrice()
            .then(({ ton, stars }) => {
                if (cancelled) return;
                if (Number.isFinite(ton) && ton > 0) {
                    setMinStakeTon(ton);
                }
                if (Number.isFinite(stars) && stars > 0) {
                    setMinStakeStars(stars);
                }
            })
            .catch(() => {
                /* fallback — константы */
            })
            .finally(() => {
                if (!cancelled) {
                    setIsLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    return {
        isLoading,
        minStakeTon,
        minStakeStars,
        stakeTiersTon: [...STAKE_TIERS_TON],
        stakeTiersStars: [...STAKE_TIERS_STARS],
    };
};
