'use client';

import Image from 'next/image';
import cls from './TableInfo.module.scss';

import CopyIcon from '../assets/copy-icon.svg';
import { PlayerRow } from './PlayerRow';
import type { TablePlayer } from './types';

interface TableInfoProps {
    players: TablePlayer[];
    gameId: string;
    hash: string;
    currency: 'ton' | 'star';
    onCopyHash: () => void;
}

export function TableInfo({ players, gameId, hash, currency, onCopyHash }: TableInfoProps) {
    return (
        <div className={cls.info}>
            <div className={cls.infoHeader}>
                <span className={cls.infoPlayers}>Игроков ({players.length})</span>
                <span className={cls.infoGameId}>ИГРА {gameId}</span>
            </div>

            <div className={cls.playersList}>
                {players.map((p) => (
                    <PlayerRow key={p.id} player={p} currency={currency} />
                ))}
            </div>

            <div className={cls.hashRow}>
                <span className={cls.hashLabel}>Hash:</span>
                <span className={cls.hashValue}>{hash}</span>
                <button type="button" className={cls.hashCopy} onClick={onCopyHash} aria-label="Копировать хеш">
                    <Image src={CopyIcon} alt="" width={10} height={12} />
                </button>
            </div>
        </div>
    );
}
