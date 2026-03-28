'use client';

import cls from '../../upgrate.module.scss';
import type { TableCurrency, TableState } from '@/entites/multiplayer/api/api';

const MAX_PLAYERS_OPTIONS = [2, 3, 4, 5, 6, 8, 10];

interface CreateTablePanelProps {
    currency: TableCurrency;
    onCurrencyChange: (c: TableCurrency) => void;
    betAmount: string;
    onBetAmountChange: (v: string) => void;
    maxPlayers: number;
    onMaxPlayersChange: (n: number) => void;
    table: TableState | null;
    isLoading: boolean;
    error: string | null;
    onCreateTable: () => void;
    onCloseTable: () => void;
}

export function CreateTablePanel({
    currency,
    onCurrencyChange,
    betAmount,
    onBetAmountChange,
    maxPlayers,
    onMaxPlayersChange,
    table,
    isLoading,
    error,
    onCreateTable,
    onCloseTable,
}: CreateTablePanelProps) {
    if (table) {
        return (
            <div className={cls.tablePanel}>
                <div className={cls.tableSuccess}>
                    <span className={cls.tablePanelLabel}>Стол создан</span>
                    <div className={cls.tableInfoRow}>
                        <span className={cls.tableInfoKey}>Валюта</span>
                        <span className={cls.tableInfoVal}>{table.currency}</span>
                    </div>
                    <div className={cls.tableInfoRow}>
                        <span className={cls.tableInfoKey}>Ставка</span>
                        <span className={cls.tableInfoVal}>{table.betAmount}</span>
                    </div>
                    <div className={cls.tableInfoRow}>
                        <span className={cls.tableInfoKey}>Мест</span>
                        <span className={cls.tableInfoVal}>
                            {table.participants.length} / {table.maxPlayers}
                        </span>
                    </div>
                    <div className={cls.tableParticipants}>
                        <span className={cls.tablePanelLabel}>Участники</span>
                        {table.participants.map((p, i) => (
                            <div key={p.userId} className={cls.tableParticipantRow}>
                                <span className={cls.tableParticipantNum}>{i + 1}.</span>
                                <span className={cls.tableParticipantId}>{p.username}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {error && <p className={cls.tableError}>{error}</p>}

                <button
                    type="button"
                    className={`${cls.upgradeButton} ${cls.tableCloseBtn}`}
                    onClick={onCloseTable}
                    disabled={isLoading}
                >
                    <span>{isLoading ? 'Закрываем...' : 'Закрыть стол'}</span>
                </button>
            </div>
        );
    }

    return (
        <div className={cls.tablePanel}>
            {/* Currency selector */}
            <div className={cls.tablePanelSection}>
                <span className={cls.tablePanelLabel}>Валюта</span>
                <div className={cls.currencySelector}>
                    {(['TON', 'STARS'] as TableCurrency[]).map((c) => (
                        <button
                            key={c}
                            type="button"
                            className={`${cls.currencyBtn} ${currency === c ? cls.currencyBtnActive : ''}`}
                            onClick={() => onCurrencyChange(c)}
                        >
                            {c}
                        </button>
                    ))}
                </div>
            </div>

            {/* Bet amount */}
            <div className={cls.tablePanelSection}>
                <span className={cls.tablePanelLabel}>Ставка</span>
                <input
                    className={cls.betInput}
                    type="number"
                    min="0"
                    step="any"
                    placeholder={`Сумма в ${currency}`}
                    value={betAmount}
                    onChange={(e) => onBetAmountChange(e.target.value)}
                />
            </div>

            {/* Max players */}
            <div className={cls.tablePanelSection}>
                <span className={cls.tablePanelLabel}>Максимум игроков</span>
                <div className={cls.maxPlayersRow}>
                    {MAX_PLAYERS_OPTIONS.map((n) => (
                        <button
                            key={n}
                            type="button"
                            className={`${cls.maxPlayerBtn} ${maxPlayers === n ? cls.maxPlayerBtnActive : ''}`}
                            onClick={() => onMaxPlayersChange(n)}
                        >
                            {n}
                        </button>
                    ))}
                </div>
            </div>

            {error && <p className={cls.tableError}>{error}</p>}

            <button
                type="button"
                className={cls.upgradeButton}
                onClick={onCreateTable}
                disabled={isLoading || !betAmount || parseFloat(betAmount) <= 0}
            >
                <span>{isLoading ? 'Создаём...' : 'Создать стол'}</span>
            </button>
        </div>
    );
}
