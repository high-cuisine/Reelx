'use client';

import cls from './TablePlayButton.module.scss';

interface TablePlayButtonProps {
    stake: number;
    currency: 'ton' | 'star';
    onClick?: () => void;
}

export function TablePlayButton({ stake, currency, onClick }: TablePlayButtonProps) {
    const suffix = currency === 'ton' ? 'TON' : 'звёзд';
    return (
        <button type="button" className={cls.playButton} onClick={onClick}>
            Играть за {stake} {suffix}
        </button>
    );
}
