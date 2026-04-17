import { useState, useEffect, useRef } from 'react';

interface UseWheelSpinReturn {
    rotation: number;
    isSpinning: boolean;
}

const SPIN_DURATION = 5000; // 5 секунд
const MIN_ROTATIONS = 1; // 1 полный оборот
const MAX_ROTATIONS = 2; // максимум 2 полных оборота

export const useWheelSpin = (
    externalIsSpinning?: boolean,
    onSpinComplete?: (rotation: number, lockedTargetIndex: number | null) => void,
    targetIndex?: number | null,
    itemsCount?: number,
    /** Центр целевого слота в градусах (как Wheel / conic-gradient); иначе считаем равные сектора. */
    targetSlotCenterDeg?: number | null,
): UseWheelSpinReturn => {
    const [rotation, setRotation] = useState(0);
    const [isSpinning, setIsSpinning] = useState(false);
    const animationFrameRef = useRef<number | null>(null);
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

            // 1 или 2 полных оборота до приза
            const fullRotations = Math.random() < 0.5 ? MIN_ROTATIONS : MAX_ROTATIONS;

            let additionalRotation = 0;

            const lockedIdx =
                targetIndex !== null &&
                targetIndex !== undefined &&
                itemsCount &&
                itemsCount > 0 &&
                targetIndex >= 0 &&
                targetIndex < itemsCount
                    ? targetIndex
                    : null;

            if (
                lockedIdx !== null &&
                targetSlotCenterDeg != null &&
                Number.isFinite(targetSlotCenterDeg)
            ) {
                const targetRotation = 360 - targetSlotCenterDeg;
                additionalRotation = fullRotations * 360 + targetRotation;
                console.log(
                    `🎯 useWheelSpin: Целевой индекс: ${lockedIdx}, центр слота: ${targetSlotCenterDeg}°, оборотов: ${fullRotations}, доп. поворот: ${additionalRotation}°`,
                );
            } else if (lockedIdx !== null && itemsCount && itemsCount > 0) {
                const segmentAngle = 360 / itemsCount;
                const targetSegmentCenter = lockedIdx * segmentAngle + segmentAngle / 2;
                const targetRotation = 360 - targetSegmentCenter;
                additionalRotation = fullRotations * 360 + targetRotation;
                console.log(`🎯 useWheelSpin: Целевой индекс (равные сектора): ${lockedIdx}, оборотов: ${fullRotations}, угол: ${additionalRotation}°`);
            } else {
                additionalRotation = fullRotations * 360 + Math.random() * 360;
                console.log(`🎯 useWheelSpin: Случайный спин, оборотов: ${fullRotations}, угол: ${additionalRotation}°`);
            }

            const startRotation = rotation;
            const finalRotation = startRotation + additionalRotation;
            finalRotationRef.current = finalRotation;

            const startTime = performance.now();

            const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

            const animate = (time: number) => {
                const elapsed = time - startTime;
                const t = Math.min(1, elapsed / SPIN_DURATION);
                const eased = easeOutCubic(t);
                const currentRotation = startRotation + additionalRotation * eased;
                setRotation(currentRotation);

                if (t < 1) {
                    animationFrameRef.current = requestAnimationFrame(animate);
                } else {
                    console.log(`⏰ useWheelSpin: Вращение завершено через ${SPIN_DURATION}ms`);
                    setIsSpinning(false);
                    if (onSpinCompleteRef.current) {
                        console.log(
                            '📞 useWheelSpin: onSpinComplete угол:',
                            finalRotationRef.current,
                            'lockedIdx:',
                            lockedIdx,
                        );
                        onSpinCompleteRef.current(finalRotationRef.current, lockedIdx);
                    } else {
                        console.warn('⚠️ useWheelSpin: onSpinCompleteRef.current is undefined!');
                    }
                }
            };

            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            animationFrameRef.current = requestAnimationFrame(animate);
        }
    }, [externalIsSpinning, isSpinning, targetIndex, itemsCount, targetSlotCenterDeg, rotation]);

    // Отдельный эффект для очистки при размонтировании
    useEffect(() => {
        return () => {
            if (animationFrameRef.current !== null) {
                console.log('🗑️ useWheelSpin: Очистка animationFrame при размонтировании');
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    return {
        rotation,
        isSpinning,
    };
};

