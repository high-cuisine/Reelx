import { useState } from 'react';

/** Фиксированные минимумы: 1 TON и 90 STARS. */
export const useMinPrice = () => {
    const [minStakeTon] = useState<number>(1);
    const [stepTon] = useState<number>(1);
    const [minStakeStars] = useState<number>(90);
    const [stepStars] = useState<number>(90);
    const [isLoading] = useState(false);

    return {
        isLoading,
        minStakeTon,
        stepTon,
        minStakeStars,
        stepStars,
    };
};
