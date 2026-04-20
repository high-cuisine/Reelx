import { useState, useEffect, useRef } from 'react';

interface UseWheelSpinReturn {
    rotation: number;
    isSpinning: boolean;
}

const SPIN_DURATION = 5000; // 5 секунд
const MIN_ROTATIONS = 1; // 1 полный оборот
const MAX_ROTATIONS = 2; // максимум 2 полных оборота

function normalizeDeg(deg: number): number {
    return ((deg % 360) + 360) % 360;
}

export const useWheelSpin = (
    externalIsSpinning?: boolean,
    onSpinComplete?: (rotation: number, lockedTargetIndex: number | null) => void,
    targetIndex?: number | null,
    itemsCount?: number,
    /** Центр целевого слота в градусах (как Wheel / conic-gradient); иначе считаем равные сектора. */
    targetSlotCenterDeg?: number | null,
    /** Текущий визуальный угол колеса (manualRotation) в момент старта спина — обязателен для корректной остановки. */
    visualBaseRotationDeg?: number,
): UseWheelSpinReturn => {
    const [rotation, setRotation] = useState(0);
    const [isSpinning, setIsSpinning] = useState(false);
    const animationFrameRef = useRef<number | null>(null);
    const onSpinCompleteRef = useRef(onSpinComplete);
    const finalRotationRef = useRef<number>(0);
    /** Последний визуальный угол с родителя (manualRotation), обновляется каждый рендер без подписки эффекта на каждый кадр */
    const visualBaseRef = useRef(0);

    // Обновляем ref при изменении callback
    useEffect(() => {
        onSpinCompleteRef.current = onSpinComplete;
    }, [onSpinComplete]);

    if (typeof visualBaseRotationDeg === 'number' && Number.isFinite(visualBaseRotationDeg)) {
        visualBaseRef.current = visualBaseRotationDeg;
    }

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

            // Важно: между спинами колесо крутится через manualRotation, а внутренний rotation здесь может быть «устаревшим».
            // Берём последний визуальный угол из ref; если его нет — rotation из этого хука.
            const startRotation = normalizeDeg(
                Number.isFinite(visualBaseRef.current) ? visualBaseRef.current : rotation,
            );

            if (
                lockedIdx !== null &&
                targetSlotCenterDeg != null &&
                Number.isFinite(targetSlotCenterDeg)
            ) {
                const slotCenter = normalizeDeg(targetSlotCenterDeg);
                // Нужно: slotCenter + (startRotation + additional) ≡ 0 (mod 360)  →  additional ≡ -slotCenter - start (mod 360)
                const delta = normalizeDeg(360 - slotCenter - startRotation);
                additionalRotation = fullRotations * 360 + delta;
                console.log(
                    `🎯 useWheelSpin: Целевой индекс: ${lockedIdx}, центр слота: ${targetSlotCenterDeg}°, оборотов: ${fullRotations}, доп. поворот: ${additionalRotation}°`,
                );
            } else if (lockedIdx !== null && itemsCount && itemsCount > 0) {
                const segmentAngle = 360 / itemsCount;
                const targetSegmentCenter = normalizeDeg(lockedIdx * segmentAngle + segmentAngle / 2);
                const delta = normalizeDeg(360 - targetSegmentCenter - startRotation);
                additionalRotation = fullRotations * 360 + delta;
                console.log(`🎯 useWheelSpin: Целевой индекс (равные сектора): ${lockedIdx}, оборотов: ${fullRotations}, угол: ${additionalRotation}°`);
            } else {
                additionalRotation = fullRotations * 360 + Math.random() * 360;
                console.log(`🎯 useWheelSpin: Случайный спин, оборотов: ${fullRotations}, угол: ${additionalRotation}°`);
            }

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

