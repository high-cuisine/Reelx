import Image from 'next/image';
import tonIcon from '@/assets/ton.svg';
import { UserGift } from '@/entites/user/api/api';
import { GiftImageOrLottie } from '@/shared/ui/GiftImageOrLottie/GiftImageOrLottie';
import cls from '../inventory.module.scss';

interface GiftItemProps {
    gift: UserGift;
    onClick?: (gift: UserGift) => void;
}

export const GiftItem: React.FC<GiftItemProps> = ({ gift, onClick }) => {
    const handleClick = () => {
        onClick?.(gift);
    };

    return (
        <div className={cls.giftItem} onClick={handleClick} style={{ cursor: 'pointer' }}>
            <div className={cls.giftImage}>
                <GiftImageOrLottie
                    image={gift.image || '/NFT.png'}
                    lottieUrl={gift.lottieUrl}
                    alt={gift.giftName}
                    fillContainer
                    loop={false}
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
