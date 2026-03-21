import { wheelColors } from '../config/wheelColors';

/**
 * Генерирует строку conic-gradient для колеса фортуны
 * @param itemsCount - общее количество "записей" (элементов) в колесе
 * @param groupSizes - необязательный массив размеров групп (сколько записей в каждой ячейке)
 * @returns строка для CSS свойства background
 */
export const generateConicGradient = (itemsCount: number, groupSizes?: number[]): string => {
    if (itemsCount <= 0) {
        return 'none';
    }

    const segmentAngle = 360 / itemsCount;

    // Если переданы размеры групп, рисуем доли круга пропорционально количеству элементов в каждой группе
    if (groupSizes && groupSizes.length > 0) {
        let currentAngle = 0;

        const gradientParts = groupSizes.map((size, index) => {
            const colorIndex = index % wheelColors.length;
            const startAngle = currentAngle;
            const endAngle = currentAngle + size * segmentAngle;
            currentAngle = endAngle;
            return `${wheelColors[colorIndex]} ${startAngle}deg ${endAngle}deg`;
        });

        return `conic-gradient(${gradientParts.join(',')})`;
    }

    // Старое поведение: равные сегменты для каждого элемента
    const gradientParts = Array.from({ length: itemsCount }, (_, index) => {
        const colorIndex = index % wheelColors.length;
        const startAngle = index * segmentAngle;
        const endAngle = (index + 1) * segmentAngle;
        return `${wheelColors[colorIndex]} ${startAngle}deg ${endAngle}deg`;
    });

    return `conic-gradient(${gradientParts.join(',')})`;
};

