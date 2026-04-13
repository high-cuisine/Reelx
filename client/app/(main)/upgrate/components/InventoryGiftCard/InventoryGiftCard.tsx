'use client';

import { useState } from 'react';
import Image from 'next/image';
import cls from '../../upgrate.module.scss';
import tonIcon from '@/assets/ton.svg';
import { GiftImageOrLottie } from '@/shared/ui/GiftImageOrLottie/GiftImageOrLottie';
import { UserGift } from '@/entites/user/api/api';
import { formatGiftName } from '../../helpers/formatGiftName';
import { FALLBACK_COLORS } from '../../helpers/constants';

interface InventoryGiftCardProps {
    gift: UserGift;
    index: number;
    isSelected: boolean;
    onToggle: () => void;
}

export function InventoryGiftCard({ gift, index, isSelected, onToggle }: InventoryGiftCardProps) {
    const [lottieReplayNonce, setLottieReplayNonce] = useState(0);

    const handleClick = () => {
        setLottieReplayNonce((n) => n + 1);
        onToggle();
    };

    return (
        <button
            type="button"
            className={`${cls.giftItem} ${isSelected ? cls.giftItemSelected : ''}`}
            onClick={handleClick}
        >
            <div
                className={cls.giftImageBox}
                style={{ background: FALLBACK_COLORS[index % FALLBACK_COLORS.length] }}
            >
                <GiftImageOrLottie
                    image={gift.image || '/NFT.png'}
                    lottieUrl={gift.lottieUrl}
                    alt={gift.giftName}
                    fillContainer
                    loop={false}
                    replayNonce={lottieReplayNonce}
                    hideLottieBackground
                    className={cls.giftImageMedia}
                    imageClassName={cls.giftImageImg}
                />
            </div>
            <span className={cls.giftName}>{formatGiftName(gift.giftName)}</span>
            <div className={cls.giftPrice}>
                <Image src={tonIcon} alt="TON" width={10} height={10} />
                <span>{(gift.price ?? 0).toFixed(2)}</span>
            </div>
        </button>
    );
}
