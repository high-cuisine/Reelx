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
                    selectedMultiplier={selectedMultiplier}
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
        </div>
    );
}
