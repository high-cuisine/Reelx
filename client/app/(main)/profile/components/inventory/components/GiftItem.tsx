import Image from 'next/image';
import tonIcon from '@/assets/ton.svg';
import { UserGift } from '@/entites/user/api/api';
import cls from '../inventory.module.scss';

interface GiftItemProps {
    gift: UserGift;
}

export const GiftItem: React.FC<GiftItemProps> = ({ gift }) => {
    return (
        <div className={cls.giftItem}>
            <div className={cls.giftImage}>
                <Image
                    src={gift.image || '/NFT.png'}
                    alt={gift.giftName}
                    width={112}
                    height={112}
                    className={cls.nftImage}
                />
            </div>
            <div className={cls.giftName}>{gift.giftName}</div>
            {gift.price !== undefined && (
                <div className={cls.giftPrice}>
                    <Image src={tonIcon} alt="TON" width={10} height={10} />
                    <span>{gift.price.toFixed(2)}</span>
                </div>
            )}
        </div>
    );
};
