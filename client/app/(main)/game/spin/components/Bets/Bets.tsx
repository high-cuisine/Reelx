'use client'
import { useRef, useEffect } from 'react';
import Image from 'next/image';
import cls from './Bets.module.scss';
import starIcon from '@/assets/star.svg';
import { Button } from '@/shared/ui/Button/Button';
import { eventBus, MODAL_EVENTS } from '@/features/eventBus/eventBus';
import type { CurrencyType } from '../../hooks/useCurrency';

interface WheelItem {
    name: string;
    price?: number;
    image?: string;
    lottie?: string;
}

interface BetsProps {
    rolls: number;
    pricePerRoll: number;
    totalPrice: number;
    minStake?: number;
    mode: 'normal' | 'multy' | 'mystery';
    giftCount: number;
    isSpinning: boolean;
    canPlay: boolean;
    wheelItems?: WheelItem[];
    currency: CurrencyType;
    onToggleCurrency: () => void;
    onIncreaseRolls: () => void;
    onDecreaseRolls: () => void;
    onPlay: () => void;
}

const Bets = ({ 
    rolls,
    pricePerRoll,
    totalPrice,
    minStake = 1,
    mode,
    giftCount,
    isSpinning,
    canPlay,
    wheelItems = [],
    currency,
    onToggleCurrency,
    onIncreaseRolls,
    onDecreaseRolls,
    onPlay,
}: BetsProps) => {
    const playLockRef = useRef(false);

    useEffect(() => {
        if (!isSpinning) playLockRef.current = false;
    }, [isSpinning]);

    const handlePlay = () => {
        if (isSpinning || !canPlay || playLockRef.current) return;
        playLockRef.current = true;
        onPlay();
    };

    const handleGiftClick = () => {
        // Для модалки показываем каждый приз только один раз по имени
        const uniqueByName: WheelItem[] = [];
        const seen = new Set<string>();

        for (const item of wheelItems) {
            // Дедупликация по имени
            if (seen.has(item.name)) continue;
            seen.add(item.name);
            uniqueByName.push(item);
        }

        eventBus.emit(MODAL_EVENTS.OPEN_GIFTS_MODAL, uniqueByName);
    };

    const renderCurrencyIcon = () => {
        if (currency === 'stars') {
            return (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M6.62648 11.8584L3.47589 13.8763C3.14829 14.0861 2.72002 13.9785 2.51933 13.636C2.42131 13.4687 2.39209 13.2672 2.43829 13.077L2.926 11.0701C3.10205 10.3455 3.57625 9.73995 4.22078 9.4164L7.65791 7.69108C7.81815 7.61065 7.88569 7.40963 7.80876 7.2421C7.74645 7.10642 7.60555 7.0305 7.46371 7.05618L3.63774 7.74868C2.86001 7.88946 2.06246 7.66492 1.45749 7.13489L0.24884 6.07591C-0.0456195 5.81791 -0.0842833 5.35919 0.162483 5.05134C0.2825 4.9016 0.455088 4.80865 0.641375 4.79341L4.33417 4.49126C4.59506 4.46991 4.82242 4.2973 4.92257 4.04454L6.34719 0.44913C6.49423 0.0780415 6.90115 -0.0981639 7.25609 0.0555626C7.42651 0.129376 7.56192 0.270945 7.63253 0.44913L9.05714 4.04454C9.15729 4.2973 9.38465 4.46991 9.64553 4.49126L13.3587 4.79507C13.7417 4.82641 14.0278 5.17644 13.9978 5.57689C13.9835 5.76952 13.8963 5.94824 13.7557 6.07359L10.9239 8.59764C10.7244 8.77533 10.6375 9.05503 10.6988 9.32131L11.5694 13.1025C11.6593 13.493 11.4294 13.8858 11.0559 13.9798C10.8764 14.025 10.6871 13.9937 10.5297 13.8928L7.35324 11.8584C7.13024 11.7156 6.84947 11.7156 6.62648 11.8584Z" fill="white"/>
                </svg>
            );
        } else {
            // TON icon
            return (
                <svg width="14" height="14" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10.0518 0H1.94773C0.457675 0 -0.486758 1.60728 0.262888 2.90663L5.26443 11.5755C5.59081 12.1415 6.40873 12.1415 6.73511 11.5755L11.7377 2.90663C12.4863 1.60936 11.5419 0 10.0528 0H10.0518ZM5.26036 8.97581L4.17111 6.86776L1.54286 2.16721C1.36947 1.86635 1.58363 1.48082 1.94671 1.48082H5.25934V8.97683L5.26036 8.97581ZM10.4547 2.1662L7.82741 6.86878L6.73816 8.97581V1.4798H10.0508C10.4139 1.4798 10.628 1.86534 10.4547 2.1662Z" fill="white"/>
                </svg>
            );
        }
    };

    return (
        <div className={cls.bets}>
            <div className={cls.topRow}>
                <div className={cls.currencyButtonWrapper}>
                    <button 
                        className={`${cls.iconButton} ${cls.currencyButton}`} 
                        onClick={onToggleCurrency}
                        disabled={isSpinning}
                        title={`Переключить на ${currency === 'stars' ? 'TON' : 'STARS'}`}
                    >
                        {renderCurrencyIcon()}
                    </button>
                </div>

                <div className={cls.rollSelector}>
                    
                    {mode === 'multy' && (
                        <div className={`${cls.currencyBadge} ${cls.multyBadge}`}>
                            Multy
                        </div>
                    )}
                    {mode === 'mystery' && (
                        <div className={`${cls.currencyBadge} ${cls.mysteryBadge}`}>
                            Mystery
                        </div>
                    )}
                    <button 
                        className={cls.controlButton}
                        onClick={onDecreaseRolls}
                        disabled={isSpinning || totalPrice <= minStake}
                    >
                        <span className={cls.minus}>−</span>
                    </button>
                    <div className={cls.rollInfo}>
                        <span className={cls.rollText}>1 Roll за {totalPrice} {currency === 'stars' ? 'STARS' : 'TON'}</span>
                    </div>
                    <button 
                        className={cls.controlButton}
                        onClick={onIncreaseRolls}
                        disabled={isSpinning}
                    >
                        <span className={cls.plus}>+</span>
                    </button>
                </div>

                <button className={cls.giftButton} onClick={handleGiftClick}>
                    <svg 
                        width="24" 
                        height="24" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg"
                        className={cls.giftIcon}
                    >
                        <path 
                            d="M20 6H17.42C17.79 5.59 18 5.11 18 4.5C18 3.12 16.88 2 15.5 2C14.89 2 14.41 2.21 14 2.58L12 4.58L10 2.58C9.59 2.21 9.11 2 8.5 2C7.12 2 6 3.12 6 4.5C6 5.11 6.21 5.59 6.58 6H4C2.9 6 2 6.9 2 8V19C2 20.1 2.9 21 4 21H20C21.1 21 22 20.1 22 19V8C22 6.9 21.1 6 20 6ZM15.5 4C15.78 4 16 4.22 16 4.5C16 4.78 15.78 5 15.5 5C15.22 5 15 4.78 15 4.5C15 4.22 15.22 4 15.5 4ZM8.5 4C8.78 4 9 4.22 9 4.5C9 4.78 8.78 5 8.5 5C8.22 5 8 4.78 8 4.5C8 4.22 8.22 4 8.5 4ZM20 19H4V8H20V19Z" 
                            fill="white"
                        />
                        <path 
                            d="M12 8V19M7 12H17" 
                            stroke="white" 
                            strokeWidth="1.5" 
                            strokeLinecap="round"
                        />
                    </svg>
                    {giftCount > 0 && (
                        <span className={cls.badge}>{giftCount}</span>
                    )}
                </button>
            </div>

            <div
                onClick={handlePlay}
                style={isSpinning ? { pointerEvents: 'none', cursor: 'not-allowed' } : undefined}
            >
                <Button
                    text={isSpinning ? 'Крутится...' : 'Играть'}
                    customClass={!canPlay || isSpinning ? cls.disabled : ''}
                />
            </div>
        </div>
    );
};

export { Bets };

