'use client'
import Image from 'next/image';
import cls from './Wheel.module.scss'
import { generateConicGradient } from '../../helpers/generateConicGradient';
import { GiftItem } from '@/entites/gifts/interfaces/giftItem.interface';
import { GiftImageOrLottie } from '@/shared/ui/GiftImageOrLottie/GiftImageOrLottie';
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

    // Сектора с игрушками (type === 'gift') — разная ширина, вариация ±20%
    let conicGradient = 'none';
    let groupVisualSizes: number[] = groups.map((g) => g.count);

    if (totalItemsCount > 0) {
        const baseTotal = groups.reduce((sum, group) => sum + group.count, 0) || totalItemsCount;
        const giftGroupCount = groups.filter((g) => g.item.type === 'gift').length;

        let giftIndex = 0;
        const rawWeights = groups.map((group) => {
            if (group.item.type === 'gift') {
                // Множитель в диапазоне [0.8, 1.2] для вариации ±20%
                const t = giftGroupCount > 1 ? giftIndex / (giftGroupCount - 1) : 0.5;
                const multiplier = 0.8 + 0.4 * t;
                giftIndex += 1;
                return group.count * multiplier;
            }
            return group.count;
        });

        const rawTotal = rawWeights.reduce((sum, w) => sum + w, 0);
        const scale = rawTotal > 0 ? baseTotal / rawTotal : 1;
        groupVisualSizes = rawWeights.map((w) => w * scale);

        conicGradient = generateConicGradient(
            totalItemsCount,
            groupVisualSizes,
        );
    }

    // Центр сектора в градусах (0° = сверху) по визуальным размерам
    const getSegmentCenterAngle = (groupIndex: number) => {
        const unitAngle = 360 / totalItemsCount;
        let sum = 0;
        for (let i = 0; i < groupIndex; i++) sum += groupVisualSizes[i];
        return (sum + groupVisualSizes[groupIndex] / 2) * unitAngle;
    };

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
                    transition: 'none',
                }}>
                {groups.map((group, index) => {
                    // Позиция по центру сектора с учётом переменной ширины (±20% для игрушек)
                    const centerAngleDeg = getSegmentCenterAngle(index);
                    const radian = (centerAngleDeg * Math.PI) / 180;
                    const radius = 35;
                    const x = 50 + radius * Math.cos(radian - Math.PI / 2);
                    const y = 50 + radius * Math.sin(radian - Math.PI / 2);
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
                            ) : item.type === 'money' ? (
                                <MoneyBadge item={item} />
                            ) : item.image || item.lottie ? (
                                <div className={cls.segmentMedia}>
                                    <GiftImageOrLottie
                                        image={item.image}
                                        lottieUrl={item.lottie}
                                        alt={item.name}
                                        width={18}
                                        height={18}
                                        hideLottieBackground
                                        className={cls.segmentLottie}
                                        imageClassName={cls.segmentImage}
                                    />
                                </div>
                            ) : (
                                <span className={cls.segmentText}>
                                    {item.name.includes('#') ? (
                                        <>
                                            <span className={cls.segmentTextTitle}>{item.name.split('#')[0]}</span>
                                            <span className={cls.segmentTextSubtitle}>#{item.name.split('#')[1]}</span>
                                        </>
                                    ) : (
                                        <span className={cls.segmentTextTitle}>{item.name}</span>
                                    )}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export { Wheel }