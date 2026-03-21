/**
 * Вычисляет позицию контента в сегменте колеса
 * @param index - индекс сегмента
 * @param segmentAngle - угол одного сегмента в градусах
 * @param radius - радиус от центра в процентах (по умолчанию 35%)
 * @returns объект с координатами x и y в процентах
 */
export const calculateSegmentPosition = (
    index: number,
    segmentAngle: number,
    radius: number = 35
): { x: number; y: number } => {
    // Угол центра сегмента
    const angle = index * segmentAngle + segmentAngle / 2;
    // Конвертируем в радианы
    const radian = (angle * Math.PI) / 180;
    // Вычисляем координаты (с учетом того, что 0° находится сверху)
    const x = 50 + radius * Math.cos(radian - Math.PI / 2);
    const y = 50 + radius * Math.sin(radian - Math.PI / 2);
    
    return { x, y };
};

