'use client';

import { useEffect, useContext, useState } from 'react';
import { useTonWallet, TonConnectUIContext } from '@tonconnect/ui-react';
import { UserGift } from '@/entites/user/api/api';
import { GiftImageOrLottie } from '@/shared/ui/GiftImageOrLottie/GiftImageOrLottie';
import { Button } from '@/shared/ui/Button/Button';
import { nftWithdrawService } from '@/features/nft/nft';
import { updateUserBalance } from '@/features/user/user';
import cls from './NftModal.module.scss';

interface NftModalProps {
    isOpen: boolean;
    onClose: () => void;
    nft: UserGift | null;
    onSell?: (nft: UserGift) => void;
    onWithdraw?: (nft: UserGift) => void;
}

const TonIcon = () => (
    <svg width="13" height="13" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="10" fill="#0098EA"/>
        <path d="M13.2515 5.18506H6.74827C5.55257 5.18506 4.7947 6.47487 5.39626 7.51757L9.40979 14.4741C9.6717 14.9284 10.328 14.9284 10.59 14.4741L14.6043 7.51757C15.205 6.47653 14.4472 5.18506 13.2523 5.18506H13.2515ZM9.40652 12.388L8.53245 10.6963L6.42338 6.9242C6.28425 6.68277 6.4561 6.37338 6.74746 6.37338H9.40571V12.3888L9.40652 12.388ZM13.5747 6.92339L11.4665 10.6971L10.5924 12.388V6.37257H13.2507C13.542 6.37257 13.7139 6.68195 13.5747 6.92339Z" fill="white"/>
    </svg>
);

export const NftModal = ({ isOpen, onClose, nft, onSell, onWithdraw }: NftModalProps) => {
    const wallet = useTonWallet();
    const tonConnectUI = useContext(TonConnectUIContext);
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [withdrawError, setWithdrawError] = useState<string | null>(null);
    const [isSelling, setIsSelling] = useState(false);
    const [sellError, setSellError] = useState<string | null>(null);
    const [lottieReplay, setLottieReplay] = useState(0);

    useEffect(() => {
        if (!isOpen || !nft) return;
        setLottieReplay(0);
    }, [isOpen, nft?.id]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            document.body.dataset.modalOpen = '1';
        } else {
            document.body.style.overflow = 'unset';
            delete document.body.dataset.modalOpen;
        }

        return () => {
            document.body.style.overflow = 'unset';
            delete document.body.dataset.modalOpen;
        };
    }, [isOpen]);

    const handleSell = async () => {
        if (!nft || !onSell) return;

        setIsSelling(true);
        setSellError(null);

        try {
            const response = await nftWithdrawService.buyNft(nft.id);
            updateUserBalance(response.refundAmount, 'ton');
            onSell(nft);
            onClose();
        } catch (error: any) {
            const message = error.response?.data?.message ?? error.message ?? 'Ошибка при продаже NFT';
            setSellError(message);
        } finally {
            setIsSelling(false);
        }
    };

    const handleWithdraw = async () => {
        if (!nft || !wallet) {
            if (!wallet) handleConnectWallet();
            return;
        }

        setIsWithdrawing(true);
        setWithdrawError(null);

        try {
            const walletAddress = wallet.account.address;
            const response = await nftWithdrawService.withdrawNft(nft.id, walletAddress);

            if (response.success) {
                if (onWithdraw) {
                    onWithdraw(nft);
                }
                onClose();
            } else {
                setWithdrawError(response.error || 'Ошибка при выводе NFT');
            }
        } catch (error: any) {
            console.error('Error withdrawing NFT:', error);
            setWithdrawError(error.response?.data?.message || error.message || 'Ошибка при выводе NFT');
        } finally {
            setIsWithdrawing(false);
        }
    };

    const handleConnectWallet = async () => {
        if (tonConnectUI) {
            await tonConnectUI.openModal();
        }
    };

    const handleDisconnectWallet = () => {
        if (!tonConnectUI) return;
        try {
            (tonConnectUI as { disconnect?: () => void }).disconnect?.();
        } catch (e) {
            console.error('Failed to disconnect wallet', e);
        }
    };

    if (!nft) return null;

    const isWalletConnected = !!wallet;
    const walletDisplayAddress = wallet?.account?.address
        ? `${wallet.account.address.slice(0, 4)}...${wallet.account.address.slice(-4)}`
        : null;

    const sellPrice = nft.price ? (nft.price * 0.8).toFixed(2) : '0.00';
    const withdrawFee = '0.05';
    const headerTitle = nft.giftName.includes('#')
        ? nft.giftName.split('#')[0].trim() || nft.giftName
        : nft.giftName;
    const lottieTrim = nft.lottieUrl?.trim();

    return (
        <div className={`${cls.bottomSheet} ${isOpen ? cls.open : ''}`}>
            <div className={cls.dimmer} onClick={onClose} role="presentation" />

            <div className={cls.sheet}>
                <div className={cls.header}>
                    <h2 className={cls.title}>{headerTitle}</h2>
                    <button type="button" className={cls.closeButton} onClick={onClose} aria-label="Закрыть">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="10" cy="10" r="10" fill="rgba(255, 255, 255, 0.08)" />
                            <path d="M6 6L14 14M14 6L6 14" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                <div className={cls.sheetBody}>
                    <div className={cls.previewCard}>
                        <div
                            className={`${cls.previewMedia} ${lottieTrim ? cls.previewMediaReplayable : ''}`}
                            role={lottieTrim ? 'button' : undefined}
                            tabIndex={lottieTrim ? 0 : undefined}
                            onClick={
                                lottieTrim
                                    ? (e) => {
                                          e.stopPropagation();
                                          setLottieReplay((n) => n + 1);
                                      }
                                    : undefined
                            }
                            onKeyDown={
                                lottieTrim
                                    ? (e) => {
                                          if (e.key === 'Enter' || e.key === ' ') {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              setLottieReplay((n) => n + 1);
                                          }
                                      }
                                    : undefined
                            }
                        >
                            <GiftImageOrLottie
                                image={nft.image}
                                lottieUrl={lottieTrim || undefined}
                                alt={nft.giftName}
                                fillContainer
                                loop={false}
                                replayNonce={lottieTrim ? lottieReplay : undefined}
                                className={cls.mediaRoot}
                                imageClassName={cls.nftImage}
                                placeholder={<div className={cls.nftPlaceholder}>🎁</div>}
                            />
                        </div>
                        <div className={cls.nftName}>
                            {nft.giftName.includes('#') ? (
                                <>
                                    <span className={cls.nftNameTitle}>{nft.giftName.split('#')[0]}</span>
                                    <span className={cls.nftNameSubtitle}>#{nft.giftName.split('#')[1]}</span>
                                </>
                            ) : (
                                <span className={cls.nftNameTitle}>{nft.giftName}</span>
                            )}
                        </div>
                    </div>

                    <div className={cls.actions}>
                        <button
                            className={cls.sellButton}
                            onClick={isWalletConnected ? handleSell : handleConnectWallet}
                            disabled={isSelling}
                        >
                            <span>{isSelling ? 'Продаём...' : 'Продать за'}</span>
                            {!isSelling && (
                                <div className={cls.priceTag}>
                                    <TonIcon />
                                    <span>{sellPrice}</span>
                                </div>
                            )}
                        </button>
                        {sellError && <div className={cls.errorMessage}>{sellError}</div>}

                        <button
                            className={cls.withdrawButton}
                            onClick={isWalletConnected ? handleWithdraw : handleConnectWallet}
                            disabled={isWithdrawing}
                        >
                            <span>{isWithdrawing ? 'Вывод...' : 'Вывод'}</span>
                            {!isWithdrawing && (
                                <div className={cls.withdrawPriceTag}>
                                    <TonIcon />
                                    <span>{withdrawFee}</span>
                                </div>
                            )}
                        </button>
                        {withdrawError && <div className={cls.errorMessage}>{withdrawError}</div>}

                        <button type="button" className={cls.backButton} onClick={onClose}>
                            Назад
                        </button>

                        {isWalletConnected ? (
                            <div className={cls.walletCard}>
                                <span className={cls.walletCardLabel}>Привязанный кошелек:</span>
                                <div className={cls.walletCardRow}>
                                    <span className={cls.walletCardAddress}>{walletDisplayAddress}</span>
                                    <button
                                        type="button"
                                        className={cls.walletCardDisconnect}
                                        onClick={handleDisconnectWallet}
                                    >
                                        Отвязать
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div onClick={handleConnectWallet}>
                                <Button customClass={cls.walletConnectButton} text="Подключить TON кошелёк" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
