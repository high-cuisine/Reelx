/**
 * Вычисляет общую цену на основе количества бросков и цены за один бросок
 * @param rolls - количество бросков
 * @param pricePerRoll - цена за один бросок
 * @returns общая цена
 */
export const calculateTotalPrice = (rolls: number, pricePerRoll: number): number => {
    return rolls * pricePerRoll;
};

