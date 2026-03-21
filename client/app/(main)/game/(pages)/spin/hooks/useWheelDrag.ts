import { useState, useRef, useCallback, useEffect } from 'react';

interface UseWheelDragProps {
    isSpinning: boolean;
    currentRotation: number;
    onRotationChange: (rotation: number) => void;
}

export const useWheelDrag = ({ isSpinning, currentRotation, onRotationChange }: UseWheelDragProps) => {
    const [isDragging, setIsDragging] = useState(false);
    const wheelRef = useRef<HTMLDivElement>(null);
    const dragDataRef = useRef({
        startAngle: 0,
        currentAngle: 0,
        lastAngle: 0,
        lastTime: 0,
        velocity: 0,
        centerX: 0,
        centerY: 0,
    });
    const animationRef = useRef<number | null>(null);
    const velocityRef = useRef(0);

    // Функция для вычисления угла между центром колеса и точкой клика
    const calculateAngle = useCallback((clientX: number, clientY: number) => {
        const { centerX, centerY } = dragDataRef.current;
        const deltaX = clientX - centerX;
        const deltaY = clientY - centerY;
        return Math.atan2(deltaY, deltaX) * (180 / Math.PI);
    }, []);

    // Функция для анимации затухания вращения
    const animateInertia = useCallback(() => {
        if (Math.abs(velocityRef.current) < 0.05) {
            velocityRef.current = 0;
            animationRef.current = null;
            return;
        }

        // Применяем трение (замедление) - уменьшено для более долгого вращения
        const friction = 0.98;
        velocityRef.current *= friction;

        onRotationChange(currentRotation + velocityRef.current);

        animationRef.current = requestAnimationFrame(animateInertia);
    }, [currentRotation, onRotationChange]);

    // Обработчик начала перетаскивания
    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (isSpinning || !wheelRef.current) return;

        e.preventDefault();
        
        const rect = wheelRef.current.getBoundingClientRect();
        dragDataRef.current.centerX = rect.left + rect.width / 2;
        dragDataRef.current.centerY = rect.top + rect.height / 2;
        
        const angle = calculateAngle(e.clientX, e.clientY);
        dragDataRef.current.startAngle = angle - currentRotation;
        dragDataRef.current.lastAngle = angle;
        dragDataRef.current.lastTime = Date.now();
        dragDataRef.current.velocity = 0;
        velocityRef.current = 0;

        // Останавливаем анимацию инерции если она была
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
        }

        setIsDragging(true);
    }, [isSpinning, currentRotation, calculateAngle]);

    // Обработчик перемещения мыши
    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging) return;

        e.preventDefault();

        const currentTime = Date.now();
        const currentAngle = calculateAngle(e.clientX, e.clientY);
        const rotation = currentAngle - dragDataRef.current.startAngle;

        // Вычисляем скорость вращения
        const timeDelta = currentTime - dragDataRef.current.lastTime;
        if (timeDelta > 0) {
            let angleDelta = currentAngle - dragDataRef.current.lastAngle;
            
            // Обрабатываем переход через 180/-180 градусов
            if (angleDelta > 180) angleDelta -= 360;
            if (angleDelta < -180) angleDelta += 360;
            
            // Увеличен множитель для более резвого вращения
            dragDataRef.current.velocity = angleDelta / timeDelta * 20;
        }

        dragDataRef.current.lastAngle = currentAngle;
        dragDataRef.current.lastTime = currentTime;

        onRotationChange(rotation);
    }, [isDragging, calculateAngle, onRotationChange]);

    // Обработчик отпускания мыши
    const handleMouseUp = useCallback(() => {
        if (!isDragging) return;

        setIsDragging(false);

        // Определяем резкий свайп и применяем нелинейное усиление
        const baseVelocity = dragDataRef.current.velocity;
        const absVelocity = Math.abs(baseVelocity);
        
        // Базовое усиление 1.5x, но при резком свайпе (>8) добавляем экспоненциальное усиление
        let multiplier = 1.5;
        if (absVelocity > 8) {
            // Резкий свайп! Добавляем дополнительное усиление
            const swipeBoost = 1 + (absVelocity - 8) / 10;
            multiplier = 1.5 * swipeBoost;
        }
        
        velocityRef.current = baseVelocity * multiplier;
        
        if (Math.abs(velocityRef.current) > 0.3) {
            animationRef.current = requestAnimationFrame(animateInertia);
        }
    }, [isDragging, animateInertia]);

    // Touch события для мобильных устройств
    const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        if (isSpinning || !wheelRef.current || e.touches.length === 0) return;

        const touch = e.touches[0];
        const rect = wheelRef.current.getBoundingClientRect();
        dragDataRef.current.centerX = rect.left + rect.width / 2;
        dragDataRef.current.centerY = rect.top + rect.height / 2;
        
        const angle = calculateAngle(touch.clientX, touch.clientY);
        dragDataRef.current.startAngle = angle - currentRotation;
        dragDataRef.current.lastAngle = angle;
        dragDataRef.current.lastTime = Date.now();
        dragDataRef.current.velocity = 0;
        velocityRef.current = 0;

        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
        }

        setIsDragging(true);
    }, [isSpinning, currentRotation, calculateAngle]);

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (!isDragging || e.touches.length === 0) return;

        e.preventDefault();

        const touch = e.touches[0];
        const currentTime = Date.now();
        const currentAngle = calculateAngle(touch.clientX, touch.clientY);
        const rotation = currentAngle - dragDataRef.current.startAngle;

        const timeDelta = currentTime - dragDataRef.current.lastTime;
        if (timeDelta > 0) {
            let angleDelta = currentAngle - dragDataRef.current.lastAngle;
            
            if (angleDelta > 180) angleDelta -= 360;
            if (angleDelta < -180) angleDelta += 360;
            
            // Увеличен множитель для более резвого вращения на touch
            dragDataRef.current.velocity = angleDelta / timeDelta * 20;
        }

        dragDataRef.current.lastAngle = currentAngle;
        dragDataRef.current.lastTime = currentTime;

        onRotationChange(rotation);
    }, [isDragging, calculateAngle, onRotationChange]);

    const handleTouchEnd = useCallback(() => {
        if (!isDragging) return;

        setIsDragging(false);

        // Определяем резкий свайп и применяем нелинейное усиление
        const baseVelocity = dragDataRef.current.velocity;
        const absVelocity = Math.abs(baseVelocity);
        
        // Базовое усиление 1.5x, но при резком свайпе (>8) добавляем экспоненциальное усиление
        let multiplier = 1.5;
        if (absVelocity > 8) {
            // Резкий свайп! Добавляем дополнительное усиление
            const swipeBoost = 1 + (absVelocity - 8) / 10;
            multiplier = 1.5 * swipeBoost;
        }
        
        velocityRef.current = baseVelocity * multiplier;
        
        if (Math.abs(velocityRef.current) > 0.3) {
            animationRef.current = requestAnimationFrame(animateInertia);
        }
    }, [isDragging, animateInertia]);

    // Подписка на глобальные события
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('touchmove', handleTouchMove, { passive: false });
            window.addEventListener('touchend', handleTouchEnd);
            window.addEventListener('touchcancel', handleTouchEnd);

            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
                window.removeEventListener('touchmove', handleTouchMove);
                window.removeEventListener('touchend', handleTouchEnd);
                window.removeEventListener('touchcancel', handleTouchEnd);
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    // Останавливаем drag если начался спин
    useEffect(() => {
        if (isSpinning && isDragging) {
            setIsDragging(false);
            velocityRef.current = 0;
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
            }
        }
    }, [isSpinning, isDragging]);

    return {
        wheelRef,
        isDragging,
        handleMouseDown,
        handleTouchStart,
    };
};

