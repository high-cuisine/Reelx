import {
    STAKE_TIERS_STARS,
    STAKE_TIERS_TON,
} from '../constants/stakeTiers';

/** Совместимость: минимумы = первый уровень из таблицы шагов */
export const useMinPrice = () => {
    const minStakeTon = STAKE_TIERS_TON[0];
    const minStakeStars = STAKE_TIERS_STARS[0];
    const isLoading = false;

    return {
        isLoading,
        minStakeTon,
        minStakeStars,
        stakeTiersTon: [...STAKE_TIERS_TON],
        stakeTiersStars: [...STAKE_TIERS_STARS],
    };
};
