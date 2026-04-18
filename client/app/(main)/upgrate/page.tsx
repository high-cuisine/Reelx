'use client';

import cls from './upgrate.module.scss';
import { GiftsModal } from '@/shared/layout/GiftsModal/GiftsModal';
import { Header } from '@/shared/layout/Header/Header';
import { useUpgratePage } from './hooks';
import {
    UpgradeArena,
    BeforeAfterRow,
    MultipliersRow,
    UpgradeButton,
    TabBar,
    GiftGrid,
} from './components';

export default function UpgratePage() {
    const {
        activeTab,
        setActiveTab,
        selectedMultiplier,
        selectedGifts,
        toggleMultiplier,
        toggleGiftSelection,
        inventoryGifts,
        isLoadingGifts,
        chance,
        bet,
        winning,
        selectedWishPrice,
        poolGifts,
        isLoadingChance,
        canSelectWish,
        selectedWishNames,
        onSelectWish,
        startGame,
        gameResult,
        isPlaying,
        handleAnimationComplete,
        showLoseMessage,
    } = useUpgratePage();

    return (
        <div className={cls.page}>
            <Header />
            <div className={cls.bgEllipse} />

            <UpgradeArena
                chance={chance}
                isLoadingChance={isLoadingChance}
                isPlaying={isPlaying}
                result={gameResult?.result ?? null}
                onAnimationComplete={handleAnimationComplete}
            />

            <BeforeAfterRow
                bet={bet}
                selectedWishPrice={selectedWishPrice}
                isLoadingChance={isLoadingChance}
            />

            <div className={cls.bottomSection}>
                <MultipliersRow
                    selectedMultiplier={selectedMultiplier}
                    onToggle={toggleMultiplier}
                />

                <UpgradeButton
                    selectedCount={selectedGifts.length}
                    isReadyToPlay={
                        selectedGifts.length > 0 &&
                        !isLoadingChance &&
                        chance != null &&
                        selectedWishNames.length > 0
                    }
                    hasWishSelected={selectedWishNames.length > 0}
                    isPlaying={isPlaying}
                    onPlay={startGame}
                />

                <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

                <div className={cls.giftGrid}>
                    <GiftGrid
                        activeTab={activeTab}
                        isLoadingGifts={isLoadingGifts}
                        inventoryGifts={inventoryGifts}
                        selectedGifts={selectedGifts}
                        onToggleGift={toggleGiftSelection}
                        poolGifts={poolGifts}
                        isLoadingChance={isLoadingChance}
                        canSelectWish={canSelectWish}
                        selectedWishNames={selectedWishNames}
                        onSelectWish={onSelectWish}
                    />
                </div>
            </div>
            <GiftsModal />

            {showLoseMessage && (
                <div className={cls.loseOverlay}>
                    <div className={cls.loseCard}>
                        <div className={cls.loseIconWrap}>
                            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                                <circle cx="20" cy="20" r="20" fill="rgba(255,80,80,0.15)" />
                                <path d="M14 14L26 26M26 14L14 26" stroke="#FF5C5C" strokeWidth="2.5" strokeLinecap="round" />
                            </svg>
                        </div>
                        <span className={cls.loseTitle}>Не повезло</span>
                        <span className={cls.loseSubtitle}>Попробуй ещё раз!</span>
                    </div>
                </div>
            )}
        </div>
    );
}
