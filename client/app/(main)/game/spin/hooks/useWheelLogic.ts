import { useEffect, useState } from 'react';
import { useWheelSpin } from './useWheelSpin';
import { useWheelDrag } from './useWheelDrag';
import { calculateSelectedSegment } from '../helpers/calculateSelectedSegment';
import { GiftItem } from '@/entites/gifts/interfaces/giftItem.interface';

interface UseWheelLogicParams {
  items: GiftItem[];
  externalIsSpinning?: boolean;
  onSpinComplete?: (selectedItem: GiftItem) => void;
  targetIndex?: number | null;
}

export function useWheelLogic({
  items,
  externalIsSpinning,
  onSpinComplete,
  targetIndex,
}: UseWheelLogicParams) {
  const [manualRotation, setManualRotation] = useState(0);

  const handleSpinComplete = (rotation: number) => {
    if (!onSpinComplete) return;
    const selectedIndex = calculateSelectedSegment(rotation, items.length);
    onSpinComplete(items[selectedIndex]);
  };

  const { rotation: spinRotation, isSpinning } = useWheelSpin(
    externalIsSpinning,
    handleSpinComplete,
    targetIndex,
    items.length,
  );

  const {
    wheelRef,
    isDragging,
    handleMouseDown,
    handleTouchStart,
  } = useWheelDrag({
    isSpinning,
    currentRotation: manualRotation,
    onRotationChange: setManualRotation,
  });

  // Используем rotation от спина или ручное вращение
  const rotation = isSpinning ? spinRotation : manualRotation;

  // Синхронизируем manual rotation после окончания спина
  useEffect(() => {
    if (!isSpinning && spinRotation !== 0) {
      setManualRotation(spinRotation);
    }
  }, [isSpinning, spinRotation]);

  // Бесконечное медленное вращение, пока колесо не крутится и его не тянут
  useEffect(() => {
    if (isSpinning || isDragging) return;

    let frameId: number;
    const speed = 0.05; // градусов за кадр, очень медленно

    const animate = () => {
      setManualRotation((prev) => (prev + speed) % 360);
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [isSpinning, isDragging]);

  return {
    wheelRef,
    isDragging,
    handleMouseDown,
    handleTouchStart,
    rotation,
    isSpinning,
  };
}

