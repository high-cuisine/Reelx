'use client';

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import Image from 'next/image';
import cls from './GameDataModal.module.scss';
import tonIcon from '@/assets/ton.svg';
import starsIcon from '@/assets/star.svg';
import { GiftImageOrLottie } from '@/shared/ui/GiftImageOrLottie/GiftImageOrLottie';
import type { GameWinNft } from '@/entites/user/interface/game.interface';

export interface GamePlayer {
    id: string;
    name: string;
    avatar?: string;
    avatarColor?: string;
    status: string;
    result: number;
    isCurrentUser?: boolean;
}

export interface GameDataModalProps {
    isOpen: boolean;
    onClose: () => void;
    gameId: string;
    gameType: string;
    date: string;
    time: string;
    bet: number;
    betCurrency: 'TON' | 'STARS';
    chance: string;
    winner: string;
    /** Приз из истории — только в этом попапе (как в макете Figma) */
    winNft?: GameWinNft | null;
    onWinPrizeClick?: (win: GameWinNft) => void;
    players?: GamePlayer[];
    hash?: string;
}

const formatDateTime = (date: string, time: string) => {
    return { date, time };
};

const getAvatarLetter = (name: string) => {
    return name.charAt(0).toUpperCase();
};

const avatarColors = ['#1775CD', '#8B51E8', '#0D7042', '#199CB3', '#E85151'];

export const GameDataModal = ({
    isOpen,
    onClose,
    gameId,
    gameType,
    date,
    time,
    bet,
    betCurrency,
    chance,
    winner,
    winNft,
    onWinPrizeClick,
    players = [],
    hash,
}: GameDataModalProps) => {
    const [isClosing, setIsClosing] = useState(false);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (isOpen) {
            setIsClosing(false);
        }
    }, [isOpen]);

    const handleClose = useCallback(() => {
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
        setIsClosing(true);
        closeTimerRef.current = setTimeout(() => {
            closeTimerRef.current = null;
            setIsClosing(false);
            onClose();
        }, 300);
    }, [onClose]);

    useEffect(() => {
        return () => {
            if (closeTimerRef.current) {
                clearTimeout(closeTimerRef.current);
                closeTimerRef.current = null;
            }
        };
    }, []);

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    const copyHash = () => {
        if (hash) {
            navigator.clipboard.writeText(hash);
        }
    };

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const currencyIcon = betCurrency === 'TON' ? tonIcon : starsIcon;
    const { date: formattedDate, time: formattedTime } = formatDateTime(date, time);

    let prizeCard: ReactNode = null;
    if (winNft) {
        const prizeInner = (
            <>
                <div className={cls.winImage}>
                    <GiftImageOrLottie
                        image={winNft.image || '/NFT.png'}
                        lottieUrl={winNft.lottieUrl?.trim() || undefined}
                        alt={winNft.giftName}
                        fillContainer
                        loop={false}
                        className={cls.winImageMedia}
                        imageClassName={cls.winImageImg}
                    />
                </div>
                <div className={cls.winInfo}>
                    <span className={cls.winLabel}>Выигрыш</span>
                    <span className={cls.winTitle}>{winNft.giftName}</span>
                    <div className={cls.winAmount}>
                        <Image src={tonIcon} alt="TON" width={17} height={17} />
                        <span>{(winNft.price ?? 0).toFixed(2)}</span>
                    </div>
                </div>
            </>
        );
        prizeCard = onWinPrizeClick ? (
            <button
                type="button"
                className={`${cls.winBlock} ${cls.winBlockClickable}`}
                onClick={() => onWinPrizeClick(winNft)}
            >
                {prizeInner}
            </button>
        ) : (
            <div className={cls.winBlock}>{prizeInner}</div>
        );
    }

    return (
        <>
            <div 
                className={`${cls.overlay} ${isClosing ? cls.closing : ''}`}
                onClick={handleOverlayClick}
            />
            <div className={`${cls.modal} ${isClosing ? cls.closing : ''}`}>
                <div className={cls.header}>
                    <span className={cls.title}>Игра #{gameId}</span>
                    <button className={cls.closeButton} onClick={handleClose} />
                </div>

                <div className={cls.content}>
                    {/* Game Data */}
                    <div className={cls.gameData}>
                        <div className={cls.dataItem}>
                            <span className={cls.dataLabel}>Игра</span>
                            <span className={cls.dataValue}>#{gameId}</span>
                        </div>
                        <div className={cls.dataItem}>
                            <span className={cls.dataLabel}>Тип</span>
                            <span className={cls.dataValue}>{gameType}</span>
                        </div>
                        <div className={cls.dataItem}>
                            <span className={cls.dataLabel}>Дата</span>
                            <span className={cls.dataValue}>
                                {formattedDate} · {formattedTime}
                            </span>
                        </div>
                        <div className={cls.dataItem}>
                            <span className={cls.dataLabel}>Ставка</span>
                            <span className={cls.dataValue}>{bet} {betCurrency}</span>
                        </div>
                        <div className={cls.dataItem}>
                            <span className={cls.dataLabel}>Шанс</span>
                            <span className={cls.dataValue}>{chance}</span>
                        </div>
                        <div className={cls.dataItem}>
                            <span className={cls.dataLabel}>Победитель</span>
                            <span className={cls.dataValue}>{winner}</span>
                        </div>
                    </div>

                    {prizeCard}

                    {(players.length > 0 || hash) && <div className={cls.divider} />}

                    {/* Players List */}
                    {players.length > 0 && (
                        <>
                            <div className={cls.playersList}>
                                {players.map((player, index) => (
                                    <div key={player.id} className={cls.playerItem}>
                                        <div className={cls.playerInfo}>
                                            <div 
                                                className={cls.playerAvatar}
                                                style={{ 
                                                    backgroundColor: player.avatarColor || avatarColors[index % avatarColors.length] 
                                                }}
                                            >
                                                {player.avatar ? (
                                                    <Image src={player.avatar} alt={player.name} width={30} height={30} />
                                                ) : (
                                                    getAvatarLetter(player.name)
                                                )}
                                            </div>
                                            <div className={cls.playerDetails}>
                                                <span className={cls.playerName}>
                                                    {player.isCurrentUser ? 'Вы' : player.name}
                                                </span>
                                                <span className={cls.playerStatus}>{player.status}</span>
                                            </div>
                                        </div>
                                        <div className={`${cls.playerResult} ${player.result >= 0 ? cls.positive : cls.negative}`}>
                                            <span>{player.result >= 0 ? '+' : ''}{player.result.toFixed(2)}</span>
                                            <Image src={currencyIcon} alt={betCurrency} width={8} height={8} />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className={cls.divider} />
                        </>
                    )}

                    {/* Actions */}
                    {hash && (
                        <div className={cls.actions}>
                            <button className={`${cls.actionButton} ${cls.secondary}`} onClick={copyHash}>
                                <span className={cls.hashText}>Hash:</span>
                                <span className={cls.hashValue}>{hash.slice(0, 5)}...{hash.slice(-5)}</span>
                                <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
                                    <rect x="0.5" y="2.5" width="6" height="9" rx="1" stroke="white" strokeOpacity="0.5"/>
                                    <rect x="3" y="0.5" width="6" height="9" rx="1" fill="#35314B" stroke="white"/>
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};
