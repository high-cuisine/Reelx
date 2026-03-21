'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import cls from './CreateTableModal.module.scss';
import TonIcon from '@/assets/ton.svg';
import StarIcon from '@/assets/star.svg';
import TableTypeIconSvg from './icons/table-type-icon.svg';
import SettingsIconSvg from './icons/settings-icon.svg';

const SHEET_CLOSE_MS = 420;

type Currency = 'ton' | 'stars';

const STAKES = [1, 5, 10, 25, 50, 100, 250, 500, 1000] as const;
const PLAYERS = [2, 3, 4, 5, 6] as const;

interface CreateTableModalProps {
    isOpen: boolean;
    onClose: () => void;
}


const CreateTableModal = ({ isOpen, onClose }: CreateTableModalProps) => {
    const [mounted, setMounted] = useState(false);
    const [isShown, setIsShown] = useState(false);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [currency, setCurrency] = useState<Currency>('ton');
    const [stake, setStake] = useState<(typeof STAKES)[number]>(1);
    const [players, setPlayers] = useState<(typeof PLAYERS)[number]>(2);

    useEffect(() => {
        if (isOpen) {
            if (closeTimerRef.current) {
                clearTimeout(closeTimerRef.current);
                closeTimerRef.current = null;
            }
            setMounted(true);
            let raf2 = 0;
            const raf1 = requestAnimationFrame(() => {
                raf2 = requestAnimationFrame(() => setIsShown(true));
            });
            return () => {
                cancelAnimationFrame(raf1);
                cancelAnimationFrame(raf2);
            };
        }

        setIsShown(false);
        closeTimerRef.current = setTimeout(() => {
            setMounted(false);
            closeTimerRef.current = null;
        }, SHEET_CLOSE_MS);

        return () => {
            if (closeTimerRef.current) {
                clearTimeout(closeTimerRef.current);
                closeTimerRef.current = null;
            }
        };
    }, [isOpen]);

    useEffect(() => {
        if (!mounted) return;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [mounted]);

    useEffect(() => {
        if (!mounted) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [mounted, onClose]);

    if (!mounted) return null;

    return (
        <div className={`${cls.bottomSheet} ${isShown ? cls.open : ''}`}>
            <div className={cls.dimmer} onClick={onClose} role="presentation" />

            <div className={cls.sheet}>
                <div className={cls.header}>
                    <h2 className={cls.title}>Создать стол</h2>
                    <button type="button" className={cls.closeButton} onClick={onClose} aria-label="Закрыть">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="10" cy="10" r="10" fill="rgba(255, 255, 255, 0.08)" />
                            <path d="M6 6L14 14M14 6L6 14" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                <div className={cls.scroll}>
                    <section className={cls.card}>
                        <div className={cls.cardHeader}>
                            <Image src={TableTypeIconSvg} alt="" width={20} height={18} className={cls.cardHeaderIcon} />
                            <h3 className={cls.cardTitle}>Тип стола</h3>
                        </div>
                        <div className={cls.rowPills}>
                            <button type="button" className={`${cls.pill} ${cls.pillActive}`}>
                                Публичный
                            </button>
                            <button
                                type="button"
                                className={`${cls.pill} ${cls.pillDisabled}`}
                                disabled
                                aria-disabled="true"
                                aria-label="Приватные столы временно недоступны"
                            >
                                Приватный
                            </button>
                        </div>
                    </section>

                    <section className={cls.card}>
                        <div className={cls.cardHeader}>
                            <Image src={SettingsIconSvg} alt="" width={17} height={18} className={cls.cardHeaderIcon} />
                            <h3 className={cls.cardTitle}>Настройка</h3>
                        </div>

                        <div className={cls.sectionStack}>
                            <p className={cls.label}>Валюта</p>
                            <div className={cls.chipsRowWrap}>
                                <div className={cls.chipsRow}>
                                    <button
                                        type="button"
                                        className={`${cls.pill} ${currency === 'ton' ? cls.pillActive : ''}`}
                                        onClick={() => setCurrency('ton')}
                                    >
                                        <Image src={TonIcon} alt="" width={13} height={13} className={cls.pillIcon} />
                                        TON
                                    </button>
                                    <button
                                        type="button"
                                        className={`${cls.pill} ${currency === 'stars' ? cls.pillActive : ''}`}
                                        onClick={() => setCurrency('stars')}
                                    >
                                        <Image src={StarIcon} alt="" width={14} height={13} className={cls.pillIcon} />
                                        Звезды
                                    </button>
                                </div>
                                <div className={cls.chipsFade} aria-hidden />
                            </div>
                        </div>

                        <div className={cls.sectionStack}>
                            <p className={cls.label}>Ставка</p>
                            <div className={cls.chipsRowWrap}>
                                <div className={cls.chipsRow}>
                                    {STAKES.map((v) => (
                                        <button
                                            key={v}
                                            type="button"
                                            className={`${cls.chip} ${stake === v ? cls.chipActive : ''}`}
                                            onClick={() => setStake(v)}
                                        >
                                            {v}
                                        </button>
                                    ))}
                                </div>
                                <div className={cls.chipsFade} aria-hidden />
                            </div>
                        </div>

                        <div className={cls.divider} />

                        <div className={cls.sectionStack}>
                            <p className={cls.label}>Игроков</p>
                            <div className={cls.chipsRowWrap}>
                                <div className={cls.chipsRow}>
                                    {PLAYERS.map((n) => (
                                        <button
                                            key={n}
                                            type="button"
                                            className={`${cls.chip} ${players === n ? cls.chipActive : ''}`}
                                            onClick={() => setPlayers(n)}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                </div>
                                <div className={cls.chipsFade} aria-hidden />
                            </div>
                        </div>
                    </section>
                </div>

                <div className={cls.footer}>
                    <button type="button" className={cls.submit}>
                        Создать стол
                    </button>
                </div>
            </div>
        </div>
    );
};

export { CreateTableModal };
