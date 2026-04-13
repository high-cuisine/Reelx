'use client';

import cls from '../../upgrate.module.scss';

interface UpgradeButtonProps {
    selectedCount: number;
    isReadyToPlay: boolean;
    hasWishSelected: boolean;
    isPlaying: boolean;
    onPlay: () => void;
}

export function UpgradeButton({
    selectedCount,
    isReadyToPlay,
    hasWishSelected,
    isPlaying,
    onPlay,
}: UpgradeButtonProps) {
    const label = (() => {
        if (isReadyToPlay) {
            return isPlaying ? 'Играем...' : 'Играть';
        }
        if (selectedCount === 0) {
            return 'Играть';
        }
        if (!hasWishSelected) {
            return 'Выберите желаемый приз';
        }
        return 'Считаем шанс...';
    })();

    return (
        <button
            type="button"
            className={cls.upgradeButton}
            onClick={isReadyToPlay ? onPlay : undefined}
            disabled={!isReadyToPlay || isPlaying}
        >
            <span>{label}</span>
        </button>
    );
}
