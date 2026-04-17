'use client'
import Image from 'next/image';
import { useEffect } from 'react';
import cls from './Wheel.module.scss'
import { generateConicGradient } from '../../helpers/generateConicGradient';
import {
    buildWheelGroups,
    computeGroupVisualSizes,
    getGroupCenterAngleDeg,
} from '../../helpers/wheelGeometry';
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

    useEffect(() => {
        if (!isSpinning) return;

        const triggerLightHaptic = () => {
            try {
                window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
            } catch {
                // Ignore haptic errors to avoid affecting spin UX
            }
        };

        // Start immediately and continue with a soft pulse while spinning.
        triggerLightHaptic();
        const intervalId = window.setInterval(triggerLightHaptic, 180);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [isSpinning]);

    // Сектора с игрушками (type === 'gift') — разная ширина, вариация ±20%
    let conicGradient = 'none';
    const groupVisualSizes =
        totalItemsCount > 0
            ? computeGroupVisualSizes(groups, totalItemsCount)
            : groups.map((g) => g.count);

    if (totalItemsCount > 0) {
        conicGradient = generateConicGradient(totalItemsCount, groupVisualSizes);
    }

    return (
        <div className={cls.wheelContainer}>
            <div className={cls.infoContainer}>
                <span>Ожидание</span>
            </div>
            <div className={cls.winningTriangle}>
                <svg width="31" height="29" viewBox="0 0 31 29" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Вершина к ободу (вверх), не внутрь колеса — отражение по вертикали вокруг центра viewBox */}
                    <g transform="translate(15.5 14.5) scale(1 -1) translate(-15.5 -14.5)">
                        <g filter="url(#filter0_d_1107_1888)">
                            <path
                                d="M17.665 18C16.5103 20 13.6235 20 12.4688 18L6.40664 7.5C5.25194 5.5 6.69532 3 9.00472 3L21.1291 3C23.4385 3 24.8819 5.5 23.7271 7.5L17.665 18Z"
                                fill="white"
                            />
                        </g>
                    </g>
                    <defs>
                        <filter id="filter0_d_1107_1888" x="0" y="0" width="30.1338" height="28.5" filterUnits="userSpaceOnUse">
                            <feFlood floodOpacity="0" result="BackgroundImageFix" />
                            <feColorMatrix
                                in="SourceAlpha"
                                type="matrix"
                                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                                result="hardAlpha"
                            />
                            <feOffset dy="3" />
                            <feGaussianBlur stdDeviation="3" />
                            <feComposite in2="hardAlpha" operator="out" />
                            <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0" />
                            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1107_1888" />
                            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1107_1888" result="shape" />
                        </filter>
                    </defs>
                </svg>
            </div>

            <div className={cls.wheelRing} aria-hidden>
                <svg width="353" height="353" viewBox="0 0 353 353" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g filter="url(#filter0_i_spin_wheel_ring)">
                        <path
                            d="M176.5 0C273.978 0 353 79.0217 353 176.5C353 273.978 273.978 353 176.5 353C79.0217 353 0 273.978 0 176.5C0 79.0217 79.0217 0 176.5 0ZM176.5 12C85.6492 12 12 85.6492 12 176.5C12 267.351 85.6492 341 176.5 341C267.351 341 341 267.351 341 176.5C341 85.6492 267.351 12 176.5 12Z"
                            fill="white"
                            fillOpacity="0.03"
                        />
                        <path
                            d="M176.5 0C273.978 0 353 79.0217 353 176.5C353 273.978 273.978 353 176.5 353C79.0217 353 0 273.978 0 176.5C0 79.0217 79.0217 0 176.5 0ZM176.5 12C85.6492 12 12 85.6492 12 176.5C12 267.351 85.6492 341 176.5 341C267.351 341 341 267.351 341 176.5C341 85.6492 267.351 12 176.5 12Z"
                            fill="#3A2F78"
                        />
                        <path
                            d="M176.5 0C273.978 0 353 79.0217 353 176.5C353 273.978 273.978 353 176.5 353C79.0217 353 0 273.978 0 176.5C0 79.0217 79.0217 0 176.5 0ZM176.5 12C85.6492 12 12 85.6492 12 176.5C12 267.351 85.6492 341 176.5 341C267.351 341 341 267.351 341 176.5C341 85.6492 267.351 12 176.5 12Z"
                            fill="#1E1735"
                            fillOpacity="0.2"
                        />
                    </g>
                    <defs>
                        <filter
                            id="filter0_i_spin_wheel_ring"
                            x="0"
                            y="0"
                            width="353"
                            height="353"
                            filterUnits="userSpaceOnUse"
                            colorInterpolationFilters="sRGB"
                        >
                            <feFlood floodOpacity="0" result="BackgroundImageFix" />
                            <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                            <feColorMatrix
                                in="SourceAlpha"
                                type="matrix"
                                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                                result="hardAlpha"
                            />
                            <feOffset />
                            <feGaussianBlur stdDeviation="3" />
                            <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
                            <feColorMatrix
                                type="matrix"
                                values="0 0 0 0 0.615686 0 0 0 0 0.541176 0 0 0 0 0.952941 0 0 0 0.6 0"
                            />
                            <feBlend mode="normal" in2="shape" result="effect1_innerShadow_spin_wheel_ring" />
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
                    const centerAngleDeg = getGroupCenterAngleDeg(
                        index,
                        groupVisualSizes,
                        totalItemsCount,
                    );
                    const radian = (centerAngleDeg * Math.PI) / 180;
                    const radius = 35;
                    const x = 50 + radius * Math.cos(radian - Math.PI / 2);
                    const y = 50 + radius * Math.sin(radian - Math.PI / 2);
                    const item = group.item;
                    const segmentLabel = String(item.name ?? '');

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
                                        loop={false}
                                        className={cls.segmentLottie}
                                        imageClassName={cls.segmentImage}
                                    />
                                </div>
                            ) : (
                                <span className={cls.segmentText}>
                                    {segmentLabel.includes('#') ? (
                                        <>
                                            <span className={cls.segmentTextTitle}>{segmentLabel.split('#')[0]}</span>
                                            <span className={cls.segmentTextSubtitle}>#{segmentLabel.split('#')[1]}</span>
                                        </>
                                    ) : (
                                        <span className={cls.segmentTextTitle}>{segmentLabel}</span>
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