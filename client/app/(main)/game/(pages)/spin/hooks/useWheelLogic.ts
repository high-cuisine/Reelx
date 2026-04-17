import { useEffect, useMemo, useState } from 'react';
import { useWheelSpin } from './useWheelSpin';
import { useWheelDrag } from './useWheelDrag';
import { calculateSelectedSegment } from '../helpers/calculateSelectedSegment';
import { getFlatSlotCenterAngleDeg } from '../helpers/wheelGeometry';
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

  const targetSlotCenterDeg = useMemo(() => {
    if (
      targetIndex == null ||
      targetIndex < 0 ||
      targetIndex >= items.length ||
      items.length === 0
    ) {
      return null;
    }
    return getFlatSlotCenterAngleDeg(items, targetIndex);
  }, [items, targetIndex]);

  const handleSpinComplete = (rotation: number, lockedTargetIndex: number | null) => {
    if (!onSpinComplete) return;
    if (
      lockedTargetIndex !== null &&
      lockedTargetIndex >= 0 &&
      lockedTargetIndex < items.length
    ) {
      onSpinComplete(items[lockedTargetIndex]);
      return;
    }
    const selectedIndex = calculateSelectedSegment(rotation, items.length);
    onSpinComplete(items[selectedIndex]);
  };

  const { rotation: spinRotation, isSpinning } = useWheelSpin(
    externalIsSpinning,
    handleSpinComplete,
    targetIndex,
    items.length,
    targetSlotCenterDeg,
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

