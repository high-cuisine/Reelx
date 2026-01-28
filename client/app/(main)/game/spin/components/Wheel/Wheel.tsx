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

    const segmentAngle = calculateSegmentAngle(items.length);
    const conicGradient = generateConicGradient(items.length);

    return (
        <div className={cls.wheelContainer}>
            <div className={cls.infoContainer}>
                <span>Ожижание</span>
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
                {items.map((item, index) => {
                    const { x, y } = calculateSegmentPosition(index, segmentAngle);

                    return (
                        <div
                            key={index}
                            className={cls.segmentContent}
                            style={{
                                position: 'absolute',
                                top: `${y}%`,
                                left: `${x}%`,
                                transform: 'translate(-50%, -50%)',
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