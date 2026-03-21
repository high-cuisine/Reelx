'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import cls from './CreateTableModal.module.scss';
import TonIcon from '@/assets/ton.svg';
import StarIcon from '@/assets/star.svg';

type TableVisibility = 'public' | 'private';
type Currency = 'ton' | 'stars';

const STAKES = [1, 5, 10, 25, 50, 100, 250, 500, 1000] as const;
const PLAYERS = [2, 3, 4, 5, 6] as const;

interface CreateTableModalProps {
    isOpen: boolean;
    onClose: () => void;
}

function TableTypeIcon() {
    return (
        <svg className={cls.cardHeaderIcon} width={20} height={18} viewBox="0 0 20 18" fill="none" aria-hidden>
            <path
                d="M2 6h16v2H2V6zm0 4h6v6H2v-6zm8 0h8v6h-8v-6z"
                fill="url(#createTableGrad1)"
            />
            <defs>
                <linearGradient id="createTableGrad1" x1="10" y1="0" x2="10" y2="18" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#9D8AF3" />
                    <stop offset="1" stopColor="#7351FF" />
                </linearGradient>
            </defs>
        </svg>
    );
}

function SettingsIcon() {
    return (
        <svg className={cls.cardHeaderIcon} width={17} height={18} viewBox="0 0 17 18" fill="none" aria-hidden>
            <path
                d="M2 5.5h13v1.5H2V5.5zm0 4h10v1.5H2V9.5zm0 4h13v1.5H2v-1.5z"
                fill="url(#createTableGrad2)"
            />
            <circle cx="14" cy="6.25" r="1.25" fill="url(#createTableGrad2)" />
            <circle cx="5" cy="10.25" r="1.25" fill="url(#createTableGrad2)" />
            <circle cx="12" cy="14.25" r="1.25" fill="url(#createTableGrad2)" />
            <defs>
                <linearGradient id="createTableGrad2" x1="8.5" y1="0" x2="8.5" y2="18" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#9D8AF3" />
                    <stop offset="1" stopColor="#7351FF" />
                </linearGradient>
            </defs>
        </svg>
    );
}

const CreateTableModal = ({ isOpen, onClose }: CreateTableModalProps) => {
    const [visibility, setVisibility] = useState<TableVisibility>('public');
    const [currency, setCurrency] = useState<Currency>('ton');
    const [stake, setStake] = useState<(typeof STAKES)[number]>(1);
    const [players, setPlayers] = useState<(typeof PLAYERS)[number]>(2);

    useEffect(() => {
        if (!isOpen) return;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className={`${cls.bottomSheet} ${cls.open}`}>
            <div className={cls.dimmer} onClick={onClose} role="presentation" />

            <div className={cls.sheet}>
                <div className={cls.header}>
                    <h2 className={cls.title}>Создать стол</h2>
                    <button type="button" className={cls.closeButton} onClick={onClose} aria-label="Закрыть">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="10" cy="10" r="10" fill="rgba(255, 255, 255, 0.08)" />
                            <path
                                d="M6 6L14 14M14 6L6 14"
                                stroke="white"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                            />
                        </svg>
                    </button>
                </div>

                <div className={cls.scroll}>
                    <section className={cls.card}>
                        <div className={cls.cardHeader}>
                            <TableTypeIcon />
                            <h3 className={cls.cardTitle}>Тип стола</h3>
                        </div>
                        <div className={cls.rowPills}>
                            <button
                                type="button"
                                className={`${cls.pill} ${visibility === 'public' ? cls.pillActive : ''}`}
                                onClick={() => setVisibility('public')}
                            >
                                Публичный
                            </button>
                            <button
                                type="button"
                                className={`${cls.pill} ${visibility === 'private' ? cls.pillActive : ''}`}
                                onClick={() => setVisibility('private')}
                            >
                                Приватный
                            </button>
                        </div>
                    </section>

                    <section className={cls.card}>
                        <div className={cls.cardHeader}>
                            <SettingsIcon />
                            <h3 className={cls.cardTitle}>Настройка</h3>
                        </div>

                        <div className={cls.sectionStack}>
                            <p className={cls.label}>Валюта</p>
                            <div className={cls.rowPills}>
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
                        </div>

                        <div className={cls.divider} />

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
