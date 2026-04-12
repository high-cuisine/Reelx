'use client';

import cls from '../../upgrate.module.scss';
import { MULTIPLIERS } from '../../helpers/constants';

interface MultipliersRowProps {
    selectedMultiplier: string | null;
    onToggle: (value: string) => void;
}

export function MultipliersRow({ selectedMultiplier, onToggle }: MultipliersRowProps) {
    return (
        <div className={cls.multipliersRow}>
            {MULTIPLIERS.map((m) => (
                <button
                    key={m}
                    type="button"
                    className={`${cls.multiplierBtn} ${selectedMultiplier === m ? cls.multiplierBtnActive : ''}`}
                    onClick={() => onToggle(m)}
                >
                    {m}
                </button>
            ))}
        </div>
    );
}
