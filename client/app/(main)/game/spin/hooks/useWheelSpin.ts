import { useState, useEffect, useRef } from 'react';

interface UseWheelSpinReturn {
    rotation: number;
    isSpinning: boolean;
}

const SPIN_DURATION = 5000; // 5 секунд
const MIN_ROTATIONS = 3; // Минимум 3 полных оборота
const MIN_ROTATION_DEGREES = MIN_ROTATIONS * 360; // 1080°

export const useWheelSpin = (
    externalIsSpinning?: boolean,
    onSpinComplete?: (rotation: number) => void,
    targetIndex?: number | null,
    itemsCount?: number
): UseWheelSpinReturn => {
    const [rotation, setRotation] = useState(0);
    const [isSpinning, setIsSpinning] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const onSpinCompleteRef = useRef(onSpinComplete);
    const finalRotationRef = useRef<number>(0);

    // Обновляем ref при изменении callback
    useEffect(() => {
        onSpinCompleteRef.current = onSpinComplete;
    }, [onSpinComplete]);

    useEffect(() => {
        if (externalIsSpinning && !isSpinning) {
            console.log('🎡 useWheelSpin: Начало вращения колеса');
            setIsSpinning(true);
            
            let additionalRotation = 0;
            
            if (targetIndex !== null && targetIndex !== undefined && itemsCount && itemsCount > 0) {
                // Рассчитываем угол для остановки на конкретном индексе
                const segmentAngle = 360 / itemsCount;
                // Указатель находится сверху (0°)
                // В calculateSelectedSegment: selectedIndex = Math.floor((360 - normalizedRotation) / segmentAngle) % segmentsCount
                // Чтобы получить targetIndex, нужно: (360 - normalizedRotation) / segmentAngle ≈ targetIndex
                // normalizedRotation ≈ 360 - targetIndex * segmentAngle
                // Но нужно учесть центр сегмента, поэтому:
                const targetSegmentCenter = targetIndex * segmentAngle + segmentAngle / 2;
                // Чтобы центр сегмента оказался сверху, нужно повернуть на: 360 - targetSegmentCenter
                const targetRotation = 360 - targetSegmentCenter;
                // Добавляем минимум 3 полных оборота для эффекта
                additionalRotation = MIN_ROTATION_DEGREES + targetRotation;
                console.log(`🎯 useWheelSpin: Целевой индекс: ${targetIndex}, дополнительный угол: ${additionalRotation}°`);
            } else {
                // Если нет целевого индекса, используем случайный угол
                additionalRotation = MIN_ROTATION_DEGREES + Math.random() * 360;
                console.log(`🎯 useWheelSpin: Случайный дополнительный угол: ${additionalRotation}°`);
            }
            
            setRotation(prev => {
                const newRotation = prev + additionalRotation;
                finalRotationRef.current = newRotation;
                console.log(`🎯 useWheelSpin: Финальный угол вращения: ${newRotation}°`);
                return newRotation;
            });
            
            // Очищаем предыдущий timeout если есть
            if (timeoutRef.current) {
                console.log('🧹 useWheelSpin: Очищаем предыдущий timeout');
                clearTimeout(timeoutRef.current);
            }
            
            // Вызываем callback после завершения анимации
            console.log(`⏱️ useWheelSpin: Устанавливаем timeout на ${SPIN_DURATION}ms`);
            timeoutRef.current = setTimeout(() => {
                console.log(`⏰ useWheelSpin: Вращение завершено через ${SPIN_DURATION}ms`);
                setIsSpinning(false);
                if (onSpinCompleteRef.current) {
                    console.log('📞 useWheelSpin: Вызываем onSpinComplete callback с углом:', finalRotationRef.current);
                    onSpinCompleteRef.current(finalRotationRef.current);
                } else {
                    console.warn('⚠️ useWheelSpin: onSpinCompleteRef.current is undefined!');
                }
            }, SPIN_DURATION);
        }
    }, [externalIsSpinning, isSpinning, targetIndex, itemsCount]);

    // Отдельный эффект для очистки при размонтировании
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                console.log('🗑️ useWheelSpin: Очистка timeout при размонтировании');
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return {
        rotation,
        isSpinning,
    };
};

