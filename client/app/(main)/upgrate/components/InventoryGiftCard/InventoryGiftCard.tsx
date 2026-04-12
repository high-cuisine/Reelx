'use client';

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
    /** «×» на выбранной карточке: снять со ставки и перейти на вкладку желаемых */
    onRemoveViaX?: () => void;
}

export function InventoryGiftCard({
    gift,
    index,
    isSelected,
    onToggle,
    onRemoveViaX,
}: InventoryGiftCardProps) {
    return (
        <div
            className={`${cls.giftItemWrap} ${isSelected ? cls.giftItemSelected : ''}`.trim()}
        >
            <button type="button" className={cls.giftItem} onClick={onToggle}>
                <div
                    className={cls.giftImageBox}
                    style={{ background: FALLBACK_COLORS[index % FALLBACK_COLORS.length] }}
                >
                    <GiftImageOrLottie
                        image={gift.image || '/NFT.png'}
                        lottieUrl={gift.lottieUrl}
                        alt={gift.giftName}
                        fillContainer
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
            {isSelected && onRemoveViaX && (
                <button
                    type="button"
                    className={cls.giftRemoveX}
                    aria-label="Убрать из ставки"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onRemoveViaX();
                    }}
                >
                    ×
                </button>
            )}
        </div>
    );
}
