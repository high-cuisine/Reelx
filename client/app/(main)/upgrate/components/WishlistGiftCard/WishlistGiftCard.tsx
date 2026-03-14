'use client';

import Image from 'next/image';
import cls from '../../upgrate.module.scss';
import tonIcon from '@/assets/ton.svg';
import { PoolGift } from '@/entites/upgrate/api/api';
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
    const content = (
        <>
            <div
                className={cls.giftImageBox}
                style={{ background: FALLBACK_COLORS[index % FALLBACK_COLORS.length] }}
            >
                {gift.image ? (
                    <div className={cls.giftImageMedia}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={gift.image}
                            alt={gift.name ?? ''}
                            className={cls.giftImageImg}
                        />
                    </div>
                ) : (
                    <span className={cls.giftPlaceholder}>🎁</span>
                )}
            </div>
            <span className={cls.giftName}>{gift.name ?? 'Gift'}</span>
            <div className={cls.giftPrice}>
                <Image src={tonIcon} alt="TON" width={10} height={10} />
                <span>{(gift.price ?? 0).toFixed(2)}</span>
            </div>
        </>
    );

    const className = `${cls.giftItem} ${isSelected ? cls.giftItemSelected : ''}`.trim();

    if (isSelectable && onSelect) {
        return (
            <button
                type="button"
                className={className}
                onClick={onSelect}
            >
                {content}
            </button>
        );
    }

    return (
        <div className={className}>
            {content}
        </div>
    );
}
