'use client'
import { useState, useEffect } from 'react';
import Image, { StaticImageData } from 'next/image';
import { eventBus, MODAL_EVENTS } from '@/features/eventBus/eventBus';
import { GiftImageOrLottie } from '@/shared/ui/GiftImageOrLottie/GiftImageOrLottie';
import cls from './GiftsModal.module.scss';
import TonIcon from '@/assets/ton.svg';
import StarIcon from '@/assets/star.svg';
import NoLootIcon from '@/assets/NO_LOOT_1.svg';

interface GiftItem {
    name: string;
    price?: number;
    image?: string | StaticImageData;
    lottie?: string;
    color?: string;
}

interface GiftsModalProps {
    gifts?: GiftItem[];
}

const GiftsModal = ({ gifts = [] }: GiftsModalProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [modalGifts, setModalGifts] = useState<GiftItem[]>(gifts);

    useEffect(() => {
        const handleOpenModal = (items: GiftItem[]) => {
            setModalGifts(items);
            setIsOpen(true);
        };

        const handleCloseModal = () => {
            setIsOpen(false);
        };

        eventBus.on(MODAL_EVENTS.OPEN_GIFTS_MODAL, handleOpenModal);
        eventBus.on(MODAL_EVENTS.CLOSE_MODAL, handleCloseModal);

        return () => {
            eventBus.off(MODAL_EVENTS.OPEN_GIFTS_MODAL, handleOpenModal);
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
    };

    const handleDimmerClick = () => {
        handleClose();
    };

    if (!isOpen) return null;

    return (
        <div className={`${cls.bottomSheet} ${isOpen ? cls.open : ''}`}>
            {/* Dimmer (затемнение) */}
            <div className={cls.dimmer} onClick={handleDimmerClick} />

            {/* Модальное окно снизу */}
            <div className={cls.content}>
                {/* Заголовок */}
                <div className={cls.header}>
                    <h2 className={cls.title}>Призовой пул</h2>
                    <button className={cls.closeButton} onClick={handleClose}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="10" cy="10" r="10" fill="rgba(255, 255, 255, 0.08)"/>
                            <path d="M6 6L14 14M14 6L6 14" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                    </button>
                </div>

                {/* Сетка подарков */}
                <div className={cls.giftsGrid}>
                    {modalGifts.length > 0 ? (
                        modalGifts.map((gift, index) => {
                            let icon: string | StaticImageData | undefined = gift.image;

                            if (!icon) {
                                if (gift.name === 'TON') {
                                    icon = TonIcon;
                                } else if (gift.name === 'STARS') {
                                    icon = StarIcon;
                                } else if (gift.name === 'No loot') {
                                    icon = NoLootIcon;
                                }
                            }

                            const isSpecialIcon =
                                icon === TonIcon || icon === StarIcon || icon === NoLootIcon;
                            const size = isSpecialIcon ? 40 : 70;
                            const imageClassName = isSpecialIcon
                                ? `${cls.giftImage} ${cls.giftImageBase}`
                                : cls.giftImage;
                            const useLottie = !isSpecialIcon && (gift.lottie || gift.image);

                            return (
                                <div 
                                    key={index} 
                                    className={cls.giftCard}
                                    style={{
                                        background: gift.color 
                                            ? `linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 100%), ${gift.color}`
                                            : undefined
                                    }}
                                >
                                    {useLottie ? (
                                        <div className={cls.giftImageWrapper}>
                                            <GiftImageOrLottie
                                                image={typeof gift.image === 'string' ? gift.image : gift.image}
                                                lottieUrl={gift.lottie}
                                                alt={gift.name}
                                                width={size}
                                                height={size}
                                                imageClassName={imageClassName}
                                                placeholder={<div className={cls.giftPlaceholder}>🎁</div>}
                                            />
                                        </div>
                                    ) : icon ? (
                                        <div className={cls.giftImageWrapper}>
                                            <Image 
                                                src={icon}
                                                alt={gift.name}
                                                width={size}
                                                height={size}
                                                className={imageClassName}
                                            />
                                        </div>
                                    ) : (
                                        <div className={cls.giftImageWrapper}>
                                            <div className={cls.giftPlaceholder}>🎁</div>
                                        </div>
                                    )}
                                    <span className={cls.giftName}>
                                        {gift.name.includes('#') ? (
                                            <>
                                                <span className={cls.giftNameTitle}>{gift.name.split('#')[0]}</span>
                                                <span className={cls.giftNameSubtitle}>#{gift.name.split('#')[1]}</span>
                                            </>
                                        ) : (
                                            <span className={cls.giftNameTitle}>{gift.name}</span>
                                        )}
                                    </span>
                                </div>
                            );
                        })
                    ) : (
                        <div className={cls.noGifts}>
                            Пока нет подарков на барабане
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export { GiftsModal };
