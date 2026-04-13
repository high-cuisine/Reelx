import React from 'react';
import Image from 'next/image';
import tonIcon from '@/assets/ton.svg';
import starsIcon from '@/assets/star.svg';
import { Game } from '@/entites/user/interface/game.interface';
import { formatGameDateTime, getGameTypeName } from '../../../helpers/gameDataHelper';
import cls from '../inventory.module.scss';

interface GameHistoryItemProps {
    game: Game;
    onClick?: (game: Game) => void;
}

export const GameHistoryItem: React.FC<GameHistoryItemProps> = ({ game, onClick }) => {
    const icon = game.priceType === 'TON' ? tonIcon : starsIcon;

    return (
        <div
            className={cls.historyItem}
            onClick={() => onClick?.(game)}
            style={{ cursor: 'pointer' }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick?.(game);
                }
            }}
        >
            <div className={cls.historyItemMain}>
                <div className={cls.historyItemInfo}>
                    <div className={cls.historyItemTitle}>{getGameTypeName(game.type)}</div>
                    <div className={cls.historyItemSubtitle}>{formatGameDateTime(game.createdAt)}</div>
                </div>

                <div className={cls.historyItemValue}>
                    <Image src={icon} alt={game.priceType} width={12} height={12} />
                    <span>{game.priceAmount.toFixed(2)}</span>
                </div>
            </div>
        </div>
    );
};
