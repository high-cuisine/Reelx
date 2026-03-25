'use client';

import cls from '../../upgrate.module.scss';
import type { UpgrateTab } from '../../hooks';

interface TabBarProps {
    activeTab: UpgrateTab;
    onTabChange: (tab: UpgrateTab) => void;
}

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
    return (
        <div className={cls.tabBar}>
            <button
                type="button"
                className={`${cls.tab} ${activeTab === 'inventory' ? cls.tabActive : ''}`}
                onClick={() => onTabChange('inventory')}
            >
                Инвентарь
            </button>
            <button
                type="button"
                className={`${cls.tab} ${activeTab === 'wishlist' ? cls.tabActive : ''}`}
                onClick={() => onTabChange('wishlist')}
            >
                Желаемые
            </button>
        </div>
    );
}
