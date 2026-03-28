'use client';

import cls from './TableItem.module.scss';
import { configPayments } from '../../config/configPayments';
import Image, { type StaticImageData } from 'next/image';
import profileIcon from '@/assets/icons/profile.svg';
import boxImage from '@/assets/Box.png';

interface TableItemProps {
    id: string;
    glowColor: string;
    giftImage?: string | StaticImageData;
    currency?: {
        price: number;
        type: 'star' | 'ton';
    };
    isSelected?: boolean;
    members?: {
        id: string;
        name: string;
        avatar: string | null;
    }[];
}

const TableItem = ({ glowColor, giftImage, currency, isSelected, members = [] }: TableItemProps) => {
    const giftImg = giftImage || boxImage;
    const defaultCurrency = { price: 0, type: 'star' as const };
    const currencyData = currency || defaultCurrency;

    return (
        <div className={`${cls.tableItem} ${isSelected ? cls.selected : ''}`}>
            <div className={cls.giftContainer}>
                <div 
                    className={cls.glowEffect}
                    style={{ 
                        background: `${glowColor}` 
                    }}
                />
                <Image
                    src={giftImg}
                    alt="Gift"
                    width={120}
                    height={120}
                    className={cls.giftImage}
                />
            </div>
            <div className={cls.bottomBar}>
                <div className={cls.members}>
                    {members.slice(0, 2).map((member) => (
                        <div key={member.id} className={cls.memberAvatar}>
                            <Image
                                src={member.avatar || profileIcon}
                                alt={member.name}
                                width={16}
                                height={16}
                                className={cls.avatarImage}
                            />
                        </div>
                    ))}
                </div>
                <div className={cls.currencyButton} style={{ background: configPayments[currencyData.type].color }}>
                    <span className={cls.price}>{currencyData.price}</span>
                    <Image
                        src={configPayments[currencyData.type].iconActive}
                        alt={currencyData.type}
                        width={12}
                        height={12}
                    />
                </div>
            </div>
        </div>
    );
};

export { TableItem };

