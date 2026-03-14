import { useState, useEffect } from 'react';
import { upgrateService, GetChanceResponse } from '@/entites/upgrate/api/api';
import { MULTIPLIER_VALUES } from '../helpers/constants';

export function useChanceData(
    selectedGifts: string[],
    selectedMultiplier: string | null,
) {
    const [chanceData, setChanceData] = useState<GetChanceResponse | null>(null);
    const [isLoadingChance, setIsLoadingChance] = useState(false);

    useEffect(() => {
        if (selectedGifts.length === 0) {
            setChanceData(null);
            return;
        }
        const multiplierNum = selectedMultiplier
            ? MULTIPLIER_VALUES[selectedMultiplier]
            : 1;

        let cancelled = false;
        setIsLoadingChance(true);
        setChanceData(null);

        upgrateService
            .getChance(selectedGifts, multiplierNum)
            .then((data) => {
                if (!cancelled) setChanceData(data);
            })
            .catch((e) => {
                if (!cancelled) {
                    console.error('Ошибка get-chance:', e);
                    setChanceData(null);
                }
            })
            .finally(() => {
                if (!cancelled) setIsLoadingChance(false);
            });

        return () => {
            cancelled = true;
        };
    }, [selectedGifts, selectedMultiplier]);

    const chance = chanceData?.userToys?.[0]?.chance ?? null;
    const bet = chanceData?.userToys?.[0]?.bet ?? 0;
    const winning = chanceData?.userToys?.[0]?.winning ?? 0;
    const poolGifts = chanceData?.poolGifts ?? [];

    return { chanceData, chance, bet, winning, poolGifts, isLoadingChance };
}
