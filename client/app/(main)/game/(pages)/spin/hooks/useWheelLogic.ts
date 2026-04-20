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
  const [lockedItems, setLockedItems] = useState<GiftItem[] | null>(null);
  const [lockedItemsCount, setLockedItemsCount] = useState<number | null>(null);

  // Лочим список предметов на момент старта спина, чтобы при догрузке/смене gifts
  // после первого прокрута не ломался расчёт targetIndex/сектора.
  useEffect(() => {
    if (externalIsSpinning) {
      if (lockedItems === null) {
        setLockedItems(items);
        setLockedItemsCount(items.length);
      } else if (lockedItemsCount !== null && items.length !== lockedItemsCount) {
        // Список внезапно изменился во время спина — лучше сбросить лок и дать UI догрузить.
        setLockedItems(null);
        setLockedItemsCount(null);
      }
      return;
    }

    // После окончания спина — разблокируем.
    if (lockedItems !== null) {
      setLockedItems(null);
      setLockedItemsCount(null);
    }
  }, [externalIsSpinning, items, items.length, lockedItems, lockedItemsCount]);

  const effectiveItems = lockedItems ?? items;

  const targetSlotCenterDeg = useMemo(() => {
    if (
      targetIndex == null ||
      targetIndex < 0 ||
      targetIndex >= effectiveItems.length ||
      effectiveItems.length === 0
    ) {
      return null;
    }
    return getFlatSlotCenterAngleDeg(effectiveItems, targetIndex);
  }, [effectiveItems, targetIndex]);

  const handleSpinComplete = (rotation: number, lockedTargetIndex: number | null) => {
    if (!onSpinComplete) return;
    if (
      lockedTargetIndex !== null &&
      lockedTargetIndex >= 0 &&
      lockedTargetIndex < effectiveItems.length
    ) {
      onSpinComplete(effectiveItems[lockedTargetIndex]);
      return;
    }
    const selectedIndex = calculateSelectedSegment(rotation, effectiveItems.length);
    const selected = effectiveItems[selectedIndex];
    if (!selected) {
      // Страховка на случай рассинхронизации длины массива
      return;
    }
    onSpinComplete(selected);
  };

  const { rotation: spinRotation, isSpinning } = useWheelSpin(
    externalIsSpinning,
    handleSpinComplete,
    targetIndex,
    effectiveItems.length,
    targetSlotCenterDeg,
    manualRotation,
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

