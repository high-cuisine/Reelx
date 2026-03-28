'use client';

import Image from 'next/image';
import cls from './PlayerRow.module.scss';

import TonIcon from '@/assets/ton.svg';
import StarIcon from '@/assets/star.svg';
import type { TablePlayer } from './types';

interface PlayerRowProps {
    player: TablePlayer;
    currency: 'ton' | 'star';
}

export function PlayerRow({ player, currency }: PlayerRowProps) {
    const BetIcon = currency === 'ton' ? TonIcon : StarIcon;
    const betAlt = currency === 'ton' ? 'TON' : 'Stars';

    return (
        <div className={cls.playerRow}>
            <div className={cls.playerLeft}>
                <div className={cls.playerAvatar} style={{ background: player.color }}>
                    {player.initial}
                </div>
                <div className={cls.playerInfo}>
                    <span className={cls.playerName}>{player.name}</span>
                    <span className={cls.playerRole}>Игрок</span>
                </div>
            </div>
            <div className={cls.playerRight}>
                <span className={cls.playerBetLabel}>Ставка</span>
                <div className={cls.playerBetValue}>
                    <span className={cls.playerBetAmount}>{player.bet.toFixed(2)}</span>
                    <Image src={BetIcon} alt={betAlt} width={8} height={8} className={cls.playerBetIcon} />
                </div>
            </div>
        </div>
    );
}
