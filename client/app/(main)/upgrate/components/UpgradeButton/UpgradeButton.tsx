'use client';

import cls from '../../upgrate.module.scss';

interface UpgradeButtonProps {
    selectedCount: number;
    selectedMultiplier: string | null;
    isReadyToPlay: boolean;
    hasWishSelected: boolean;
    isPlaying: boolean;
    onPlay: () => void;
}

export function UpgradeButton({
    selectedCount,
    selectedMultiplier,
    isReadyToPlay,
    hasWishSelected,
    isPlaying,
    onPlay,
}: UpgradeButtonProps) {
    const text = (() => {
        if (selectedCount === 0) {
            return 'Выберите подарки для апгрейда';
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
            <span>
                {selectedCount === 0
                    ? text
                    : !hasWishSelected
                        ? text
                        : isReadyToPlay
                            ? isPlaying
                                ? 'Играем...'
                                : 'Играть'
                            : text}
            </span>
        </button>
    );
}
