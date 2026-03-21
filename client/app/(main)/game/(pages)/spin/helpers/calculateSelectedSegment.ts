/**
 * Вычисляет индекс выбранного сегмента на основе угла поворота
 * @param rotation - текущий угол поворота в градусах
 * @param segmentsCount - количество сегментов в колесе
 * @returns индекс выбранного сегмента (0-based)
 */
export const calculateSelectedSegment = (
    rotation: number,
    segmentsCount: number
): number => {
    const segmentAngle = 360 / segmentsCount;
    // Нормализуем угол поворота в диапазон 0-360
    const normalizedRotation = ((rotation % 360) + 360) % 360;
    // Вычисляем индекс сегмента (учитываем, что указатель находится сверху)
    const selectedIndex = Math.floor((360 - normalizedRotation) / segmentAngle) % segmentsCount;
    return selectedIndex;
};

