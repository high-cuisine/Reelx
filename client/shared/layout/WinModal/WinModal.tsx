'use client'
import { useState, useEffect, useContext, useCallback } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useTonWallet, TonConnectUIContext } from '@tonconnect/ui-react';
import { eventBus, MODAL_EVENTS } from '@/features/eventBus/eventBus';
import { nftWithdrawService } from '@/features/nft/nft';
import { updateUserBalance } from '@/features/user/user';
import { Button } from '@/shared/ui/Button/Button';
import cls from './WinModal.module.scss';

const Lottie = dynamic(() => import('lottie-react').then((m) => m.default), { ssr: false });

interface WinData {
    selectedItem: {
        name: string;
        price?: number;
        image?: string;
        lottie?: string;
    };
    rolls: number;
    totalPrice: number;
    giftId?: string;
}

const TonIcon = () => (
    <svg width="13" height="13" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="10" fill="#0098EA"/>
        <path d="M13.2515 5.18506H6.74827C5.55257 5.18506 4.7947 6.47487 5.39626 7.51757L9.40979 14.4741C9.6717 14.9284 10.328 14.9284 10.59 14.4741L14.6043 7.51757C15.205 6.47653 14.4472 5.18506 13.2523 5.18506H13.2515ZM9.40652 12.388L8.53245 10.6963L6.42338 6.9242C6.28425 6.68277 6.4561 6.37338 6.74746 6.37338H9.40571V12.3888L9.40652 12.388ZM13.5747 6.92339L11.4665 10.6971L10.5924 12.388V6.37257H13.2507C13.542 6.37257 13.7139 6.68195 13.5747 6.92339Z" fill="white"/>
    </svg>
);

const WinModal = () => {
    const pathname = usePathname();
    const wallet = useTonWallet();
    const tonConnectUI = useContext(TonConnectUIContext);
    const [isOpen, setIsOpen] = useState(false);
    const [winData, setWinData] = useState<WinData | null>(null);
    const [lottieData, setLottieData] = useState<object | null>(null);
    const [isSelling, setIsSelling] = useState(false);
    const [sellError, setSellError] = useState<string | null>(null);
    const isProfile = pathname?.includes('/profile') ?? false;

    const isWalletConnected = !!wallet;
    const walletDisplayAddress = wallet?.account?.address
        ? `${wallet.account.address.slice(0, 4)}...${wallet.account.address.slice(-4)}`
        : null;

    useEffect(() => {
        if (!isOpen || !winData?.selectedItem?.lottie) {
            setLottieData(null);
            return;
        }
        const url = winData.selectedItem.lottie;
        let cancelled = false;
        fetch(url)
            .then((r) => r.json())
            .then((data) => {
                if (!cancelled) setLottieData(data);
            })
            .catch(() => {
                if (!cancelled) setLottieData(null);
            });
        return () => {
            cancelled = true;
        };
    }, [isOpen, winData?.selectedItem?.lottie]);

    useEffect(() => {
        const handleOpenModal = (data: WinData) => {
            setWinData(data);
            setIsOpen(true);
        };

        const handleCloseModal = () => {
            setIsOpen(false);
        };

        eventBus.on(MODAL_EVENTS.OPEN_WIN_MODAL, handleOpenModal);
        eventBus.on(MODAL_EVENTS.CLOSE_MODAL, handleCloseModal);

        return () => {
            eventBus.off(MODAL_EVENTS.OPEN_WIN_MODAL, handleOpenModal);
            eventBus.off(MODAL_EVENTS.CLOSE_MODAL, handleCloseModal);
        };
    }, []);

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

    const handleClose = () => {
        setIsOpen(false);
        setSellError(null);
        setTimeout(() => setWinData(null), 300);
    };

    const handleSell = async () => {
        if (!winData?.giftId) {
            setSellError('Не удалось продать: приз не найден');
            return;
        }
        setIsSelling(true);
        setSellError(null);
        try {
            const response = await nftWithdrawService.buyNft(winData.giftId);
            updateUserBalance(response.refundAmount, 'ton');
            handleClose();
        } catch (error: any) {
            const message = error.response?.data?.message ?? error.message ?? 'Ошибка при продаже';
            setSellError(message);
        } finally {
            setIsSelling(false);
        }
    };

    const handleClaim = () => {
        handleClose();
    };

    const handleConnectWallet = useCallback(async () => {
        if (tonConnectUI) {
            await tonConnectUI.openModal();
        }
    }, [tonConnectUI]);

    const handleDisconnectWallet = useCallback(() => {
        if (!tonConnectUI) return;
        try {
            (tonConnectUI as { disconnect?: () => void }).disconnect?.();
        } catch (e) {
            console.error('Failed to disconnect wallet', e);
        }
    }, [tonConnectUI]);

    if (!winData) return null;

    const { selectedItem } = winData;
    const isNoLoot = selectedItem.name === 'NO LOOT';

    const sellPrice = selectedItem.price ? (selectedItem.price * 0.8).toFixed(2) : '4.15';
    const claimPrice = selectedItem.price ? (selectedItem.price * 0.1).toFixed(2) : '0.03';

    return (
        <div className={`${cls.winModal} ${isOpen ? cls.open : ''}`}>
            <div className={cls.background} onClick={handleClose} />

            <div className={cls.prizeCard}>
                {!isNoLoot ? (
                    <>
                        {lottieData ? (
                            <div className={cls.lottieWrap}>
                                <Lottie
                                    animationData={lottieData}
                                    loop
                                    style={{ width: 167, height: 191 }}
                                />
                            </div>
                        ) : selectedItem.image ? (
                            <Image 
                                src={selectedItem.image} 
                                alt={selectedItem.name}
                                width={167}
                                height={191}
                                className={cls.nftImage}
                            />
                        ) : (
                            <div className={cls.prizePlaceholder}>🎁</div>
                        )}
                        <div className={cls.giftName}>
                            {selectedItem.name.includes('#') ? (
                                <span className={cls.giftNameTitle}>
                                    {selectedItem.name.split('#')[0].trim()} #{selectedItem.name.split('#')[1]}
                                </span>
                            ) : (
                                <span className={cls.giftNameTitle}>{selectedItem.name}</span>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <div className={cls.prizePlaceholder}>😔</div>
                        <div className={cls.giftName}>NO LOOT</div>
                    </>
                )}
            </div>

            <div className={cls.winText}>
                <h2 className={cls.title}>
                    {isNoLoot ? 'Не повезло' : 'Вы выиграли'}
                </h2>
                <p className={cls.description}>
                    {isNoLoot 
                        ? 'В этот раз ничего не выпало, но попробуйте еще раз! 🎲' 
                        : 'Отлично! Ты выиграл крутой стикер 🔥'}
                </p>
            </div>

            {!isNoLoot && (
                <div className={cls.actions}>
                    <button
                        className={cls.sellButton}
                        onClick={isWalletConnected ? handleSell : handleConnectWallet}
                        disabled={isSelling || !winData.giftId}
                    >
                        <span>{isSelling ? 'Продаём...' : 'Продать за'}</span>
                        {!isSelling && (
                            <div className={cls.priceTag}>
                                <TonIcon />
                                <span>{sellPrice}</span>
                            </div>
                        )}
                    </button>
                    {sellError && <div className={cls.sellError}>{sellError}</div>}

                    <button className={cls.claimButton} onClick={handleClaim}>
                        <span>Забрать за</span>
                        <div className={cls.claimPriceTag}>
                            <TonIcon />
                            <span>{claimPrice}</span>
                        </div>
                    </button>

                    {isWalletConnected ? (
                        <div className={cls.walletCard}>
                            <span className={cls.walletCardLabel}>Привязанный кошелек:</span>
                            <div className={cls.walletCardRow}>
                                <span className={cls.walletCardAddress}>{walletDisplayAddress}</span>
                                <button type="button" className={cls.walletCardDisconnect} onClick={handleDisconnectWallet}>
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
            )}

            {isNoLoot && (
                <div className={cls.actions}>
                    <button className={cls.sellButton} onClick={handleClose}>
                        Попробовать снова
                    </button>
                </div>
            )}
        </div>
    );
};

export { WinModal };
