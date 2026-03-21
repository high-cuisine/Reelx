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
    selectedWishName?: string | null;
    onSelectWish?: (name: string) => void;
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
    selectedWishName = null,
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
                <p className={cls.wishHint}>
                    Можно выбрать несколько подарков — их сумма пойдёт в одну ставку.
                </p>
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
                  : 'Не удалось подобрать призы под эту комбинацию. Попробуйте другой множитель или состав ставки. Несколько подарков для ставки выбираются во вкладке «Инвентарь».';
        return <div className={cls.emptyState}>{emptyMessage}</div>;
    }

    return (
        <>
       
            {winGifts.map((g, i) => (
                <WishlistGiftCard
                    key={`win-${i}-${g.name ?? ''}-${g.price ?? 0}`}
                    gift={g}
                    index={i}
                    isSelectable={canSelectWish}
                    isSelected={g.name === selectedWishName}
                    onSelect={() => onSelectWish?.(g.name)}
                />
            ))}
        </>
    );
}
