'use client'
import { Bets } from './components/Bets/Bets';
import { Wheel } from './components/Wheel/Wheel';
import { GiftsModal } from '@/shared/layout/GiftsModal/GiftsModal';
import { useSpinPage } from './hooks/useSpinPage';
import cls from './spin.module.scss';

export default function SpinPage() {
    const {
        currency,
        toggleCurrency,
        wheelItems,
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
        isMinStakeLayout,
        moneyWinToast,
        clearMoneyWinToast,
    } = useSpinPage();

    return (
        <div className={cls.container}>
            <div className={cls.spinPage}>
                {moneyWinToast && (
                    <div
                        className={`${cls.toast} ${
                            moneyWinToast.currency === 'ton' ? cls.toastTon : cls.toastStars
                        }`}
                        role="status"
                        aria-live="polite"
                        onClick={clearMoneyWinToast}
                    >
                        <div className={cls.toastTitle}>Выигрыш</div>
                        <div className={cls.toastText}>
                            Вы выиграли {moneyWinToast.amount}{' '}
                            {moneyWinToast.currency === 'ton' ? 'TON' : 'STARS'}
                        </div>
                    </div>
                )}
                <div className={cls.spinContainer}>
                    <Wheel 
                        items={wheelItems}
                        isSpinning={isSpinning}
                        onSpinComplete={onSpinComplete}
                        targetIndex={targetIndex}
                        mode={mode}
                        uniformGiftSizing={isMinStakeLayout}
                    />
                    <Bets
                        rolls={rolls}
                        pricePerRoll={pricePerRoll}
                        totalPrice={totalPrice}
                        minStake={minStake}
                        mode={mode}
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
            </div>
        </div>
    )
}