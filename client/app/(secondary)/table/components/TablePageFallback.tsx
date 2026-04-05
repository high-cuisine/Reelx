'use client';

import Link from 'next/link';
import cls from '../Table.module.scss';

type Variant = 'no_owner' | 'loading' | 'error';

type Props = {
    variant: Variant;
    message?: string;
};

export function TablePageFallback({ variant, message }: Props) {
    const backLink = (
        <Link href="/game" className={cls.fallbackLink}>
            К списку столов
        </Link>
    );

    if (variant === 'no_owner') {
        return (
            <div className={cls.page}>
                <p className={cls.fallbackText}>Выберите стол в списке или создайте свой.</p>
                {backLink}
            </div>
        );
    }

    if (variant === 'loading') {
        return (
            <div className={cls.page}>
                <p className={cls.fallbackText}>Загрузка стола…</p>
            </div>
        );
    }

    return (
        <div className={cls.page}>
            <p className={cls.fallbackText}>{message ?? 'Стол недоступен'}</p>
            {backLink}
        </div>
    );
}
