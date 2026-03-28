import React from 'react';
import Image from 'next/image';
import tonIcon from '@/assets/ton.svg';
import starsIcon from '@/assets/star.svg';
import { Game, GameWinNft } from '@/entites/user/interface/game.interface';
import { formatGameDateTime, getGameTypeName } from '../../../helpers/gameDataHelper';
import cls from '../inventory.module.scss';

interface GameHistoryItemProps {
    game: Game;
    onClick?: (game: Game) => void;
    onWinNftClick?: (winNft: GameWinNft) => void;
}

export const GameHistoryItem: React.FC<GameHistoryItemProps> = ({
    game,
    onClick,
    onWinNftClick,
}) => {
    const icon = game.priceType === 'TON' ? tonIcon : starsIcon;

    const handleRowClick = () => {
        onClick?.(game);
    };

    const handleWinNftClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (game.winNft) onWinNftClick?.(game.winNft);
    };

    return (
        <div className={cls.historyItem} onClick={handleRowClick} style={{ cursor: 'pointer' }}>
            <div className={cls.historyItemMain}>
                <div className={cls.historyItemInfo}>
                    <div className={cls.historyItemTitle}>{getGameTypeName(game.type)}</div>
                    <div className={cls.historyItemSubtitle}>{formatGameDateTime(game.createdAt)}</div>
                    {game.winNft && (
                        <button
                            type="button"
                            className={cls.historyItemWinNft}
                            onClick={handleWinNftClick}
                        >
                            NFT: {game.winNft.giftName}
                        </button>
                    )}
                </div>

                <div className={cls.historyItemValue}>
                    <Image src={icon} alt={game.priceType} width={12} height={12} />
                    <span>{game.priceAmount.toFixed(2)}</span>
                </div>
            </div>
        </div>
    );
};
