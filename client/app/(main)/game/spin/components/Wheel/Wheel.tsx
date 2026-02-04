'use client'
import Image from 'next/image';
import cls from './Wheel.module.scss'
import { calculateSegmentAngle } from '../../helpers/calculateSegmentAngle';
import { generateConicGradient } from '../../helpers/generateConicGradient';
import { calculateSegmentPosition } from '../../helpers/calculateSegmentPosition';
import { GiftItem } from '@/entites/gifts/interfaces/giftItem.interface';
import { MoneyBadge } from './MoneyBadge';
import secretIcon from '@/assets/icons/secret.svg';
import { useWheelLogic } from '../../hooks/useWheelLogic';

interface WheelProps {
    items: GiftItem[];
    isSpinning?: boolean;
    onSpinComplete?: (selectedItem: GiftItem) => void;
    targetIndex?: number | null;
    mode: 'normal' | 'mystery' | 'multy';
}

type WheelGroup = {
    item: GiftItem;
    count: number;
    startIndex: number; // индекс первой записи этой группы в общем массиве
};

// Группируем элементы по типу+имени+цене и считаем,
// сколько "записей" приходится на каждую визуальную ячейку колеса.
const buildWheelGroups = (items: GiftItem[]): WheelGroup[] => {
    const map = new Map<string, { item: GiftItem; count: number; firstIndex: number }>();

    items.forEach((item, index) => {
        const key = `${item.type}__${item.name}__${item.price}`;
        const existing = map.get(key);

        if (existing) {
            existing.count += 1;
        } else {
            map.set(key, {
                item,
                count: 1,
                firstIndex: index,
            });
        }
    });

    // Сортируем группы по первому появлению, чтобы порядок на колесе был предсказуем
    const sorted = Array.from(map.values()).sort((a, b) => a.firstIndex - b.firstIndex);

    // Проставляем startIndex для каждой группы (накопительная сумма count)
    const groups: WheelGroup[] = [];
    let currentStartIndex = 0;

    sorted.forEach(({ item, count }) => {
        groups.push({
            item,
            count,
            startIndex: currentStartIndex,
        });
        currentStartIndex += count;
    });

    return groups;
};

const Wheel = ({ items, isSpinning: externalIsSpinning, onSpinComplete, targetIndex, mode }: WheelProps) => {
    const {
        wheelRef,
        isDragging,
        handleMouseDown,
        handleTouchStart,
        rotation,
        isSpinning,
    } = useWheelLogic({
        items,
        externalIsSpinning,
        onSpinComplete,
        targetIndex,
    });

    const totalItemsCount = items.length;
    const groups = buildWheelGroups(items);

    const segmentAngle = totalItemsCount > 0 ? calculateSegmentAngle(totalItemsCount) : 0;
    const conicGradient = generateConicGradient(
        totalItemsCount,
        groups.map((g) => g.count),
    );

    return (
        <div className={cls.wheelContainer}>
            <div className={cls.infoContainer}>
                <span>Ожидание</span>
            </div>
            <div className={cls.winningTriangle}>
                <svg  width="31" height="29" viewBox="0 0 31 29" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g filter="url(#filter0_d_1107_1888)">
                    <path d="M17.665 18C16.5103 20 13.6235 20 12.4688 18L6.40664 7.5C5.25194 5.5 6.69532 3 9.00472 3L21.1291 3C23.4385 3 24.8819 5.5 23.7271 7.5L17.665 18Z" fill="white"/></g>
                    <defs>
                        <filter id="filter0_d_1107_1888" x="0" y="0" width="30.1338" height="28.5" filterUnits="userSpaceOnUse">
                        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                        <feOffset dy="3"/>
                        <feGaussianBlur stdDeviation="3"/>
                        <feComposite in2="hardAlpha" operator="out"/>
                        <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/>
                        <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1107_1888"/>
                        <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1107_1888" result="shape"/>
                        </filter>
                    </defs>
                </svg>
            </div>
         

            <div
                ref={wheelRef}
                className={`${cls.wheel} ${isDragging ? cls.dragging : ''} ${!isSpinning ? cls.interactive : ''}`}
                style={{
                    background: conicGradient,
                    transform: `rotate(${rotation}deg)`,
                    transition: isSpinning ? 'transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
                }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
            >
                {groups.map((group, index) => {
                    // Центр группы в "индексах" базовых сегментов:
                    // если 8 записей из 10 — то группа занимает 8 сегментов,
                    // и центр находится посередине их диапазона
                    const centerIndex = group.startIndex + group.count / 2 - 0.5;
                    const { x, y } = calculateSegmentPosition(centerIndex, segmentAngle);
                    const item = group.item;

                    return (
                        <div
                            key={`${item.type}-${item.name}-${item.price}-${index}`}
                            className={cls.segmentContent}
                            style={{
                                position: 'absolute',
                                top: `${y}%`,
                                left: `${x}%`,
                                transform: `translate(-50%, -50%) rotate(${-rotation}deg)`,
                            }}
                        >
                            {mode === 'mystery' ? (
                                <Image 
                                    src={secretIcon} 
                                    alt="Secret" 
                                    width={50} 
                                    height={50}
                                    className={cls.segmentImage}
                                />
                            ) : mode === 'multy' && item.type === 'money' ? (
                                <MoneyBadge item={item} />
                            ) : item.image ? (
                                <Image 
                                    src={item.image} 
                                    alt={item.name} 
                                    width={50} 
                                    height={50}
                                    className={cls.segmentImage}
                                />
                            ) : (
                                <span className={cls.segmentText}>{item.name}</span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export { Wheel }