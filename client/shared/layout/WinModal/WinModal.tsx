'use client'
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { eventBus, MODAL_EVENTS } from '@/features/eventBus/eventBus';
import cls from './WinModal.module.scss';


interface WinData {
    selectedItem: {
        name: string;
        price?: number;
        image?: string;
    };
    rolls: number;
    totalPrice: number;
}

const WinModal = () => {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [winData, setWinData] = useState<WinData | null>(null);
    const isProfile = pathname?.includes('/profile') ?? false;

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
        setTimeout(() => setWinData(null), 300);
    };

    const handleSell = () => {
        console.log('Selling prize...');
        handleClose();
    };

    const handleClaim = () => {
        console.log('Claiming prize...');
        handleClose();
    };

    if (!winData) return null;

    const { selectedItem } = winData;
    const isNoLoot = selectedItem.name === 'NO LOOT';


    // Цены для примера
    const sellPrice = selectedItem.price ? (selectedItem.price * 0.8).toFixed(2) : '4.15';
    const claimPrice = selectedItem.price ? (selectedItem.price * 0.1).toFixed(2) : '0.03';

    return (
        <div className={`${cls.winModal} ${isOpen ? cls.open : ''}`}>
            {/* Background with gradient */}
            <div className={cls.background} />

            {/* Prize Card */}
            <div className={cls.prizeCard}>
                {!isNoLoot ? (
                    <>
                        {selectedItem.image ? (
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
                                <>
                                    <span className={cls.giftNameTitle}>{selectedItem.name.split('#')[0]}</span>
                                    <span className={cls.giftNameSubtitle}>#{selectedItem.name.split('#')[1]}</span>
                                </>
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

            {/* Win Text */}
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

            {/* Action Buttons */}
            {!isNoLoot && (
                <div className={cls.actions}>
                    <button className={cls.sellButton} onClick={handleSell}>
                        <span>Продать за</span>
                        <div className={cls.priceTag}>
                            <svg width="11" height="11" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="10" cy="10" r="10" fill="#0098EA"/>
                                <path d="M13.2515 5.18506H6.74827C5.55257 5.18506 4.7947 6.47487 5.39626 7.51757L9.40979 14.4741C9.6717 14.9284 10.328 14.9284 10.59 14.4741L14.6043 7.51757C15.205 6.47653 14.4472 5.18506 13.2523 5.18506H13.2515ZM9.40652 12.388L8.53245 10.6963L6.42338 6.9242C6.28425 6.68277 6.4561 6.37338 6.74746 6.37338H9.40571V12.3888L9.40652 12.388ZM13.5747 6.92339L11.4665 10.6971L10.5924 12.388V6.37257H13.2507C13.542 6.37257 13.7139 6.68195 13.5747 6.92339Z" fill="white"/>
                            </svg>
                            <span>{sellPrice}</span>
                        </div>
                    </button>
                    <button className={cls.claimButton} onClick={handleClaim}>
                        <span>Забрать за</span>
                        <div className={cls.priceTag}>
                            <svg width="11" height="11" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="10" cy="10" r="10" fill="#0098EA"/>
                                <path d="M13.2515 5.18506H6.74827C5.55257 5.18506 4.7947 6.47487 5.39626 7.51757L9.40979 14.4741C9.6717 14.9284 10.328 14.9284 10.59 14.4741L14.6043 7.51757C15.205 6.47653 14.4472 5.18506 13.2523 5.18506H13.2515ZM9.40652 12.388L8.53245 10.6963L6.42338 6.9242C6.28425 6.68277 6.4561 6.37338 6.74746 6.37338H9.40571V12.3888L9.40652 12.388ZM13.5747 6.92339L11.4665 10.6971L10.5924 12.388V6.37257H13.2507C13.542 6.37257 13.7139 6.68195 13.5747 6.92339Z" fill="white"/>
                            </svg>
                            <span>{claimPrice}</span>
                        </div>
                    </button>
                    {isProfile && (
                        <button className={cls.backButton} onClick={handleClose}>
                            Назад
                        </button>
                    )}
                </div>
            )}

            {isNoLoot && (
                <div className={cls.actions}>
                    <button className={cls.sellButton} onClick={handleClose}>
                        Попробовать снова
                    </button>
                    {isProfile && (
                        <button className={cls.backButton} onClick={handleClose}>
                            Назад
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export { WinModal };
