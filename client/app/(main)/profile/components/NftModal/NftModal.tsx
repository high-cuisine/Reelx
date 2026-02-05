'use client';

import { useEffect, useContext, useState } from 'react';
import Image from 'next/image';
import { useTonWallet, TonConnectUIContext } from '@tonconnect/ui-react';
import { UserGift } from '@/entites/user/api/api';
import { useUserStore } from '@/entites/user/model/user';
import { nftWithdrawService } from '@/features/nft/nft';
import cls from './NftModal.module.scss';

interface NftModalProps {
    isOpen: boolean;
    onClose: () => void;
    nft: UserGift | null;
    onSell?: (nft: UserGift) => void;
    onWithdraw?: (nft: UserGift) => void;
}

export const NftModal = ({ isOpen, onClose, nft, onSell, onWithdraw }: NftModalProps) => {
    const wallet = useTonWallet();
    const tonConnectUI = useContext(TonConnectUIContext);
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [withdrawError, setWithdrawError] = useState<string | null>(null);
    const [isSelling, setIsSelling] = useState(false);
    const [sellError, setSellError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const handleSell = async () => {
        if (!nft || !onSell) return;

        setIsSelling(true);
        setSellError(null);

        try {
            const response = await nftWithdrawService.buyNft(nft.id);
            useUserStore.getState().updateBalance(response.refundAmount, 'ton');
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

    if (!nft) return null;

    const isWalletConnected = !!wallet;

    const sellPrice = nft.price ? (nft.price * 0.8).toFixed(2) : '0.00';

    return (
        <div className={`${cls.nftModal} ${isOpen ? cls.open : ''}`}>
            <div className={cls.background} />

            <div className={cls.nftCard}>
                <div className={cls.nftImageWrapper}>
                    {nft.image ? (
                        <Image 
                            src={nft.image} 
                            alt={nft.giftName}
                            width={100}
                            height={100}
                            className={cls.nftImage}
                        />
                    ) : (
                        <div className={cls.nftPlaceholder}>🎁</div>
                    )}
                </div>
                <div className={cls.nftName}>{nft.giftName}</div>
            </div>

            <div className={cls.textBlock}>
                <h2 className={cls.title}>Ваш NFT</h2>
                <p className={cls.subtitle}>{nft.giftName}</p>
            </div>

            <div className={cls.actions}>
                {!isWalletConnected ? (
                    <button className={cls.connectButton} onClick={handleConnectWallet}>
                        Подключить кошелек
                    </button>
                ) : (
                    <>
                        <button
                            className={cls.sellButton}
                            onClick={handleSell}
                            disabled={isSelling}
                        >
                            <span>{isSelling ? 'Продаём...' : 'Продать за'}</span>
                            {!isSelling && (
                                <div className={cls.priceTag}>
                                    <svg width="11" height="11" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="10" cy="10" r="10" fill="#0098EA"/>
                                        <path d="M13.2515 5.18506H6.74827C5.55257 5.18506 4.7947 6.47487 5.39626 7.51757L9.40979 14.4741C9.6717 14.9284 10.328 14.9284 10.59 14.4741L14.6043 7.51757C15.205 6.47653 14.4472 5.18506 13.2523 5.18506H13.2515ZM9.40652 12.388L8.53245 10.6963L6.42338 6.9242C6.28425 6.68277 6.4561 6.37338 6.74746 6.37338H9.40571V12.3888L9.40652 12.388ZM13.5747 6.92339L11.4665 10.6971L10.5924 12.388V6.37257H13.2507C13.542 6.37257 13.7139 6.68195 13.5747 6.92339Z" fill="white"/>
                                    </svg>
                                    <span>{sellPrice}</span>
                                </div>
                            )}
                        </button>
                        {sellError && (
                            <div className={cls.errorMessage}>{sellError}</div>
                        )}

                        <button 
                            className={cls.withdrawButton} 
                            onClick={handleWithdraw}
                            disabled={isWithdrawing}
                        >
                            {isWithdrawing ? 'Вывод...' : 'Вывести на кошелек'}
                        </button>
                        {withdrawError && (
                            <div className={cls.errorMessage}>{withdrawError}</div>
                        )}
                    </>
                )}
                
                <button className={cls.backButton} onClick={onClose}>
                    Назад
                </button>
            </div>
        </div>
    );
};
