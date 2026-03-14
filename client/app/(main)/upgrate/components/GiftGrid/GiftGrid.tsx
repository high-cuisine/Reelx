'use client';

import cls from '../../upgrate.module.scss';
import type { UpgrateTab } from '../../hooks';
import { UserGift } from '@/entites/user/api/api';
import { PoolGift } from '@/entites/upgrate/api/api';
import { InventoryGiftCard } from '../InventoryGiftCard/InventoryGiftCard';
import { WishlistGiftCard } from '../WishlistGiftCard/WishlistGiftCard';

interface GiftGridProps {
    activeTab: UpgrateTab;
    isLoadingGifts: boolean;
    inventoryGifts: UserGift[];
    selectedGifts: string[];
    onToggleGift: (giftId: string) => void;
    poolGifts: PoolGift[];
    isLoadingChance: boolean;
    canSelectWish?: boolean;
    selectedWishId?: string | null;
    onSelectWish?: (giftId: string) => void;
}

const winPoolGifts = (gifts: PoolGift[]) => gifts.filter((g) => g.pool === 'win');

export function GiftGrid({
    activeTab,
    isLoadingGifts,
    inventoryGifts,
    selectedGifts,
    onToggleGift,
    poolGifts,
    isLoadingChance,
    canSelectWish = false,
    selectedWishId = null,
    onSelectWish,
}: GiftGridProps) {
    if (activeTab === 'inventory') {
        if (isLoadingGifts) {
            return <div className={cls.emptyState}>Загрузка...</div>;
        }
        if (inventoryGifts.length === 0) {
            return <div className={cls.emptyState}>Нет подарков в инвентаре</div>;
        }
        return (
            <>
                {inventoryGifts.map((gift, index) => (
                    <InventoryGiftCard
                        key={gift.id}
                        gift={gift}
                        index={index}
                        isSelected={selectedGifts.includes(gift.id)}
                        onToggle={() => onToggleGift(gift.id)}
                    />
                ))}
            </>
        );
    }

    const winGifts = winPoolGifts(poolGifts);
    if (winGifts.length === 0) {
        const emptyMessage =
            selectedGifts.length === 0
                ? 'Выберите подарки в инвентаре — здесь появятся желаемые'
                : isLoadingChance
                  ? 'Загрузка...'
                  : 'Нет данных о желаемых подарках';
        return <div className={cls.emptyState}>{emptyMessage}</div>;
    }

    return (
        <>
            {canSelectWish && (
                <p className={cls.wishHint}>
                    При ставке от 50 TON вы можете выбрать желаемый приз. Выберите один подарок из списка ниже.
                </p>
            )}
            {winGifts.map((g, i) => (
                <WishlistGiftCard
                    key={g.id ?? `win-${i}`}
                    gift={g}
                    index={i}
                    isSelectable={canSelectWish && !!g.id}
                    isSelected={!!g.id && g.id === selectedWishId}
                    onSelect={g.id ? () => onSelectWish?.(g.id!) : undefined}
                />
            ))}
        </>
    );
}
