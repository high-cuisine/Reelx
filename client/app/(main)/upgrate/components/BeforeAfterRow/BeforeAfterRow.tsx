'use client';

import Image from 'next/image';
import cls from '../../upgrate.module.scss';
import tonIcon from '@/assets/ton.svg';

interface BeforeAfterRowProps {
    /** Сумма выбранных подарков (ставка), только от инвентаря — не от API / мультипликатора */
    bet: number;
    /** Цена выбранного желаемого приза или null — показываем "—" */
    selectedWishPrice: number | null;
    isLoadingChance: boolean;
}

export function BeforeAfterRow({
    bet,
    selectedWishPrice,
    isLoadingChance,
}: BeforeAfterRowProps) {
    const betStr = bet.toFixed(2);
    const afterStr =
        isLoadingChance
            ? '…'
            : selectedWishPrice != null
              ? selectedWishPrice.toFixed(2)
              : '—';

    return (
        <div className={cls.beforeAfterRow}>
            <div className={cls.baSection}>
                <span className={cls.baLabel}>До</span>
                <div className={cls.valueDisplay}>
                    <Image src={tonIcon} alt="TON" width={8} height={8} />
                    <span>{betStr}</span>
                </div>
            </div>
            <div className={cls.baSection}>
                <span className={cls.baLabel}>После</span>
                <div className={cls.valueDisplay}>
                    <Image src={tonIcon} alt="TON" width={8} height={8} />
                    <span>{afterStr}</span>
                </div>
            </div>
        </div>
    );
}
