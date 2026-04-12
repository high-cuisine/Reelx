'use client';

import cls from '../../upgrate.module.scss';
import { MULTIPLIERS } from '../../helpers/constants';

interface MultipliersRowProps {
    selectedMultiplier: string | null;
    onToggle: (value: string) => void;
    /** «×» на активном множителе: сброс и переход на вкладку желаемых */
    onClearViaX?: () => void;
}

export function MultipliersRow({ selectedMultiplier, onToggle, onClearViaX }: MultipliersRowProps) {
    return (
        <div className={cls.multipliersRow}>
            {MULTIPLIERS.map((m) => (
                <div key={m} className={cls.multiplierCell}>
                    <button
                        type="button"
                        className={`${cls.multiplierBtn} ${selectedMultiplier === m ? cls.multiplierBtnActive : ''}`}
                        onClick={() => onToggle(m)}
                    >
                        {m}
                    </button>
                    {selectedMultiplier === m && onClearViaX && (
                        <button
                            type="button"
                            className={cls.multiplierRemoveX}
                            aria-label="Сбросить множитель"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onClearViaX();
                            }}
                        >
                            ×
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}
