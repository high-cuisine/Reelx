'use client';

import { useState } from 'react';
import Image from 'next/image';
import cls from '../../upgrate.module.scss';
import tonIcon from '@/assets/ton.svg';
import { PoolGift } from '@/entites/upgrate/api/api';
import { GiftImageOrLottie } from '@/shared/ui/GiftImageOrLottie/GiftImageOrLottie';
import { FALLBACK_COLORS } from '../../helpers/constants';

interface WishlistGiftCardProps {
    gift: PoolGift;
    index: number;
    isSelectable?: boolean;
    isSelected?: boolean;
    onSelect?: () => void;
}

export function WishlistGiftCard({
    gift,
    index,
    isSelectable,
    isSelected,
    onSelect,
}: WishlistGiftCardProps) {
    const [lottieReplayNonce, setLottieReplayNonce] = useState(0);

    const handleClick = () => {
        setLottieReplayNonce((n) => n + 1);
        if (isSelectable) {
            onSelect?.();
        }
    };

    const content = (
        <>
            <div
                className={cls.giftImageBox}
                style={{ background: FALLBACK_COLORS[index % FALLBACK_COLORS.length] }}
            >
                <GiftImageOrLottie
                    image={gift.image || '/NFT.png'}
                    lottieUrl={gift.lottieUrl}
                    alt={gift.name ?? 'Gift'}
                    fillContainer
                    loop={false}
                    replayNonce={lottieReplayNonce}
                    hideLottieBackground
                    className={cls.giftImageMedia}
                    imageClassName={cls.giftImageImg}
                />
            </div>
            <span className={cls.giftName}>{gift.name ?? 'Gift'}</span>
            <div className={cls.giftPrice}>
                <Image src={tonIcon} alt="TON" width={10} height={10} />
                <span>{(gift.price ?? 0).toFixed(2)}</span>
            </div>
        </>
    );

    const className = `${cls.giftItem} ${isSelected ? cls.giftItemSelected : ''}`.trim();

    return (
        <button
            type="button"
            className={className}
            onClick={handleClick}
            aria-pressed={isSelectable ? !!isSelected : undefined}
        >
            {content}
        </button>
    );
}

