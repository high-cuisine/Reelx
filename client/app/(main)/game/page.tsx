'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { TablesList, type TablesListFilters } from './components/TablesList/TablesList';
import { TableButton } from './components/TableButton/TableButton';
import { CreateTableModal } from './components/CreateTableModal/CreateTableModal';
import cls from './game.module.scss';
import starIcon from '@/assets/icons/grey-star.svg';
import tonIcon from '@/assets/ton.svg';
import { WinsStrip } from './components/WinsStrip/WinsStrip';

function FilterIcon() {
    return (
        <svg width="70" height="12" viewBox="0 0 70 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M70 1C70 0.734784 69.8946 0.48043 69.7071 0.292893C69.5196 0.105357 69.2652 0 69 0H57C56.7348 0 56.4804 0.105357 56.2929 0.292893C56.1054 0.48043 56 0.734784 56 1C56 1.26522 56.1054 1.51957 56.2929 1.70711C56.4804 1.89464 56.7348 2 57 2H69C69.2652 2 69.5196 1.89464 69.7071 1.70711C69.8946 1.51957 70 1.26522 70 1Z"
                fill="white"
                fillOpacity="0.24"
            />
            <path
                d="M70 6C70 5.73478 69.8946 5.48043 69.7071 5.29289C69.5196 5.10536 69.2652 5 69 5H59C58.7348 5 58.4804 5.10536 58.2929 5.29289C58.1054 5.48043 58 5.73478 58 6C58 6.26522 58.1054 6.51957 58.2929 6.70711C58.4804 6.89464 58.7348 7 59 7H69C69.2652 7 69.5196 6.89464 69.7071 6.70711C69.8946 6.51957 70 6.26522 70 6Z"
                fill="white"
                fillOpacity="0.24"
            />
            <path
                d="M70 11C70 10.7348 69.8946 10.4804 69.7071 10.2929C69.5196 10.1054 69.2652 10 69 10H63C62.7348 10 62.4804 10.1054 62.2929 10.2929C62.1054 10.4804 62 10.7348 62 11C62 11.2652 62.1054 11.5196 62.2929 11.7071C62.4804 11.8946 62.7348 12 63 12H69C69.2652 12 69.5196 11.8946 69.7071 11.7071C69.8946 11.5196 70 11.2652 70 11Z"
                fill="white"
                fillOpacity="0.24"
            />
        </svg>
    );
}

export default function GamePage() {
    const router = useRouter();
    const [createTableOpen, setCreateTableOpen] = useState(false);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);

    const [filters, setFilters] = useState<TablesListFilters>({
        currency: 'TON',
        sortBy: 'bet',
        sortDir: 'asc',
    });

    useEffect(() => {
        if (!filtersOpen) return;
        const onDown = (e: MouseEvent) => {
            const el = menuRef.current;
            if (!el) return;
            if (e.target instanceof Node && el.contains(e.target)) return;
            setFiltersOpen(false);
        };
        window.addEventListener('mousedown', onDown);
        return () => window.removeEventListener('mousedown', onDown);
    }, [filtersOpen]);

    return (
        <div className={cls.gamePage}>
            <WinsStrip />
            <div className={cls.downContainer}>
                <div className={cls.pageHeader}>
                    <div className={cls.headerRow}>
                        <div className={cls.currencyToggle}>
                            <button
                                type="button"
                                className={`${cls.currencyPill} ${filters.currency === 'TON' ? cls.currencyPillActive : ''}`}
                                onClick={() => setFilters((p) => ({ ...p, currency: 'TON' }))}
                            >
                                <Image src={tonIcon} alt="" width={13} height={13} />
                                TON
                            </button>
                            <button
                                type="button"
                                className={`${cls.currencyPill} ${filters.currency === 'STARS' ? cls.currencyPillActive : ''}`}
                                onClick={() => setFilters((p) => ({ ...p, currency: 'STARS' }))}
                            >
                                <Image src={starIcon} alt="" width={13} height={13} />
                                STARS
                            </button>
                        </div>

                        <div className={cls.titleContainer}>
                            <h3 className={cls.title}>Столы</h3>
                        </div>

                        <div className={cls.filtersWrap} ref={menuRef}>
                            <button
                                type="button"
                                className={cls.filtersButton}
                                onClick={() => setFiltersOpen((v) => !v)}
                                aria-label="Фильтры"
                            >
                                <FilterIcon />
                            </button>

                            {filtersOpen && (
                                <div className={cls.filtersMenu} role="menu">
                                    <div className={cls.menuTitle}>Сортировать</div>
                                    <button
                                        type="button"
                                        className={`${cls.menuRow} ${filters.sortBy === 'bet' ? cls.menuRowActive : ''}`}
                                        onClick={() => setFilters((p) => ({ ...p, sortBy: 'bet' }))}
                                    >
                                        <span className={cls.radio} />
                                        Ставка
                                    </button>
                                    <button
                                        type="button"
                                        className={`${cls.menuRow} ${filters.sortBy === 'win' ? cls.menuRowActive : ''}`}
                                        onClick={() => setFilters((p) => ({ ...p, sortBy: 'win' }))}
                                    >
                                        <span className={cls.radio} />
                                        Выигрыш
                                    </button>
                                    <button
                                        type="button"
                                        className={`${cls.menuRow} ${filters.sortBy === 'players' ? cls.menuRowActive : ''}`}
                                        onClick={() => setFilters((p) => ({ ...p, sortBy: 'players' }))}
                                    >
                                        <span className={cls.radio} />
                                        Игроков
                                    </button>

                                    <div className={cls.divider} />

                                    <button
                                        type="button"
                                        className={`${cls.menuRow} ${filters.sortDir === 'desc' ? cls.menuRowActive : ''}`}
                                        onClick={() => setFilters((p) => ({ ...p, sortDir: 'desc' }))}
                                    >
                                        <span className={cls.arrowUp} aria-hidden />
                                        Больше
                                    </button>
                                    <button
                                        type="button"
                                        className={`${cls.menuRow} ${filters.sortDir === 'asc' ? cls.menuRowActive : ''}`}
                                        onClick={() => setFilters((p) => ({ ...p, sortDir: 'asc' }))}
                                    >
                                        <span className={cls.arrowDown} aria-hidden />
                                        Меньше
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <TablesList filters={filters} />

                <TableButton onClick={() => setCreateTableOpen(true)} />
            </div>

            <CreateTableModal
                isOpen={createTableOpen}
                onClose={() => setCreateTableOpen(false)}
                onCreateTable={(ownerId) =>
                    router.push(`/table?owner=${encodeURIComponent(ownerId)}`)
                }
            />
        </div>
    );
}