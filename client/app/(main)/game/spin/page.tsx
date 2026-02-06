'use client'
import { Bets } from './components/Bets/Bets';
import { Wheel } from './components/Wheel/Wheel';
import { GiftsModal } from '@/shared/layout/GiftsModal/GiftsModal';
import { WinModal } from '@/shared/layout/WinModal/WinModal';
import { useSpinPage } from './hooks/useSpinPage';
import cls from './spin.module.scss';

export default function SpinPage() {
    const {
        currency,
        toggleCurrency,
        wheelItems,
        isLoadingGifts,
        rolls,
        pricePerRoll,
        totalPrice,
        minStake,
        giftCount,
        isSpinning,
        canPlay,
        handleIncreaseRolls,
        handleDecreaseRolls,
        handlePlay,
        onSpinComplete,
        targetIndex,
        mode,
    } = useSpinPage();

    return (
        <div className={cls.spinPage}>
            <div className={cls.spinContainer}>
                <Wheel 
                    items={wheelItems}
                    isSpinning={isSpinning}
                    onSpinComplete={onSpinComplete}
                    targetIndex={targetIndex}
                    mode={mode}
                />
                <Bets
                    rolls={rolls}
                    pricePerRoll={pricePerRoll}
                    totalPrice={totalPrice}
                    minStake={minStake}
                    giftCount={giftCount}
                    isSpinning={isSpinning}
                    canPlay={canPlay}
                    wheelItems={wheelItems}
                    currency={currency}
                    onToggleCurrency={toggleCurrency}
                    onIncreaseRolls={handleIncreaseRolls}
                    onDecreaseRolls={handleDecreaseRolls}
                    onPlay={handlePlay}
                />
            </div>
            <GiftsModal />
            <WinModal />
        </div>
    )
}