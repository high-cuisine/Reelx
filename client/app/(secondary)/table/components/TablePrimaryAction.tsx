'use client';

import type { TablePrimaryAction as TablePrimaryActionModel } from '../helpers/tableActionState';
import cls from '../Table.module.scss';
import playCls from './TablePlayButton.module.scss';

type Props = {
    action: TablePrimaryActionModel;
    onReady: () => void;
};

export function TablePrimaryAction({ action, onReady }: Props) {
    if (action.kind === 'login_hint') {
        return <p className={cls.actionHint}>Войдите в аккаунт</p>;
    }
    if (action.kind === 'disabled') {
        return (
            <button type="button" className={playCls.playButton} disabled>
                {action.label}
            </button>
        );
    }
    return (
        <button type="button" className={playCls.playButton} onClick={onReady}>
            Готов
        </button>
    );
}
