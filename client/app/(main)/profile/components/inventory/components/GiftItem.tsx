import Image from 'next/image';
import { useEffect, useState, type FC, type KeyboardEvent, type MouseEvent } from 'react';
import tonIcon from '@/assets/ton.svg';
import { UserGift } from '@/entites/user/api/api';
import { GiftImageOrLottie } from '@/shared/ui/GiftImageOrLottie/GiftImageOrLottie';
import cls from '../inventory.module.scss';

interface GiftItemProps {
    gift: UserGift;
    onClick?: (gift: UserGift) => void;
}

export const GiftItem: FC<GiftItemProps> = ({ gift, onClick }) => {
    const [lottieReplay, setLottieReplay] = useState(0);

    useEffect(() => {
        setLottieReplay(0);
    }, [gift.id]);

    const handleItemClick = () => {
        onClick?.(gift);
    };

    const handleLottieAreaClick = (e: MouseEvent) => {
        if (!gift.lottieUrl) return;
        e.stopPropagation();
        setLottieReplay((n) => n + 1);
    };

    return (
        <div className={cls.giftItem} onClick={handleItemClick} style={{ cursor: 'pointer' }}>
            <div
                className={`${cls.giftImage} ${gift.lottieUrl ? cls.giftImageReplayable : ''}`}
                onClick={gift.lottieUrl ? handleLottieAreaClick : undefined}
                role={gift.lottieUrl ? 'button' : undefined}
                tabIndex={gift.lottieUrl ? 0 : undefined}
                onKeyDown={
                    gift.lottieUrl
                        ? (e: KeyboardEvent) => {
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
                    image={gift.image || '/NFT.png'}
                    lottieUrl={gift.lottieUrl}
                    alt={gift.giftName}
                    fillContainer
                    loop={false}
                    replayNonce={gift.lottieUrl ? lottieReplay : undefined}
                    className={cls.giftImageMedia}
                    imageClassName={cls.nftImage}
                />
            </div>
            <div className={cls.giftName}>
                {gift.giftName.includes('#') ? (
                    <>
                        <span className={cls.giftNameTitle}>{gift.giftName.split('#')[0]}</span>
                        <span className={cls.giftNameSubtitle}>#{gift.giftName.split('#')[1]}</span>
                    </>
                ) : (
                    <span className={cls.giftNameTitle}>{gift.giftName}</span>
                )}
            </div>
            {gift.price !== undefined && (
                <div className={cls.giftPrice}>
                    <Image src={tonIcon} alt="TON" width={10} height={10} />
                    <span>{gift.price.toFixed(2)}</span>
                </div>
            )}
        </div>
    );
};
