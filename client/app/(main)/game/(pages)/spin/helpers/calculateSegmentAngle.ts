/**
 * Вычисляет угол одного сегмента колеса
 * @param itemsCount - количество элементов в колесе
 * @returns угол сегмента в градусах
 */
export const calculateSegmentAngle = (itemsCount: number): number => {
    return 360 / itemsCount;
};

