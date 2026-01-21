'use client';

import cls from './inventory.module.scss';
import { useInventory } from './hooks/useInventory';
import { GiftItem } from './components/GiftItem';

export const Inventory = () => {
    const { activeTab, setActiveTab, historyGifts, inventoryGifts, isLoading } = useInventory();

    return (
        <div className={cls.inventory}>
            <div className={cls.tabBar}>
                <button
                    className={`${cls.tab} ${activeTab === 'inventory' ? cls.tabActive : ''}`}
                    onClick={() => setActiveTab('inventory')}
                >
                    Инвентарь
                </button>
                <button
                    className={`${cls.tab} ${activeTab === 'history' ? cls.tabActive : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    История
                </button>
            </div>

            {activeTab === 'history' && (
                <div className={cls.inventoryList}>
                    {isLoading ? (
                        <div className={cls.emptyState}>Загрузка...</div>
                    ) : historyGifts.length === 0 ? (
                        <div className={cls.emptyState}>История пуста</div>
                    ) : (
                        historyGifts.map((gift) => (
                            <GiftItem key={gift.id} gift={gift} />
                        ))
                    )}
                </div>
            )}

            {activeTab === 'inventory' && (
                <div className={cls.inventoryList}>
                    {isLoading ? (
                        <div className={cls.emptyState}>Загрузка...</div>
                    ) : inventoryGifts.length === 0 ? (
                        <div className={cls.emptyState}>Инвентарь пуст</div>
                    ) : (
                        inventoryGifts.map((gift) => (
                            <GiftItem key={gift.id} gift={gift} />
                        ))
                    )}
                </div>
            )}
        </div>
    );
};
