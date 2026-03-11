'use client';

import cls from '../../upgrate.module.scss';

interface UpgradeButtonProps {
    selectedCount: number;
    selectedMultiplier: string | null;
    isReadyToPlay: boolean;
    isPlaying: boolean;
    onPlay: () => void;
}

export function UpgradeButton({
    selectedCount,
    selectedMultiplier,
    isReadyToPlay,
    isPlaying,
    onPlay,
}: UpgradeButtonProps) {
    const text =
        selectedCount === 0
            ? 'Выберите подарки для апгрейда'
            : 'Считаем шанс...';

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
                    : isReadyToPlay
                        ? isPlaying
                            ? 'Играем...'
                            : 'Играть'
                        : text}
            </span>
        </button>
    );
}
