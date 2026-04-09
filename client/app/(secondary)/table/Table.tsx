'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/entites/user/model/user';
import { copyOwnerIdToClipboard, formatOwnerHashShort, formatTableGameId } from './helpers/ownerDisplay';
import { useEliminationFlash } from './hooks/useEliminationFlash';
import {
    DEFAULT_REDIRECT_MS,
    REDIRECT_WHEN_WIN_MODAL_MS,
    useRedirectWhenGameFinished,
} from './hooks/useRedirectWhenGameFinished';
import { useTableLiveData } from './hooks/useTableLiveData';
import { useTableWinnerWinModal } from './hooks/useTableWinnerWinModal';
import { useTableOwnerId } from './hooks/useTableOwnerId';
import { useTablePageDerived } from './hooks/useTablePageDerived';
import { useTablePrimaryAction } from './hooks/useTablePrimaryAction';
import cls from './Table.module.scss';
import {
    TableInfo,
    TablePageFallback,
    TableVisual,
} from './components';
import { TablePrimaryAction } from './components/TablePrimaryAction';

export default function TablePage() {
    const router = useRouter();
    const ownerId = useTableOwnerId();
    const myUserId = useUserStore((s) => s.user?.userId ?? null);
    const [readyPending, setReadyPending] = useState(false);
    const [exitPending, setExitPending] = useState(false);

    const { table, loadError, bootLoading, readyErr, emitGameReady, leaveTableNow, clearReadyErr } =
        useTableLiveData(ownerId);

    const { players, game, drumPlayers, eliminatedUserIds, centerText, uiCurrency } =
        useTablePageDerived(table);

    const primaryAction = useTablePrimaryAction(table, game, myUserId);

    const eliminationFlashUserId = useEliminationFlash(game?.lastEliminatedUserId ?? null);

    const canShowTableUi = Boolean(
        ownerId && !bootLoading && !loadError && table && game,
    );

    const winnerGetsGiftModal =
        Boolean(
            myUserId &&
                game?.phase === 'finished' &&
                game?.winnerUserId === myUserId &&
                game?.winnerPrize?.giftId,
        );

    useTableWinnerWinModal(table, game, myUserId);
    useRedirectWhenGameFinished(game?.phase, canShowTableUi, {
        delayMs: winnerGetsGiftModal ? REDIRECT_WHEN_WIN_MODAL_MS : DEFAULT_REDIRECT_MS,
    });

    const gameId = formatTableGameId(ownerId);
    const hashShort = formatOwnerHashShort(ownerId);

    const handleReady = async () => {
        if (readyPending) return;
        clearReadyErr();
        try {
            setReadyPending(true);
            await emitGameReady();
        } finally {
            setReadyPending(false);
        }
    };

    const gamePhase = game?.phase ?? null;
    const showExitButton = gamePhase === 'lobby' || gamePhase === 'round_break';

    const handleExit = async () => {
        if (exitPending) return;
        try {
            setExitPending(true);
            await leaveTableNow();
        } finally {
            setExitPending(false);
            router.push('/game');
        }
    };

    if (!ownerId) {
        return <TablePageFallback variant="no_owner" />;
    }

    if (bootLoading) {
        return <TablePageFallback variant="loading" />;
    }

    if (loadError || !table || !game) {
        return <TablePageFallback variant="error" message={loadError ?? undefined} />;
    }

    return (
        <div className={cls.page}>
            {showExitButton && (
                <button
                    type="button"
                    className={cls.exitButton}
                    onClick={handleExit}
                    disabled={exitPending}
                >
                    {exitPending ? 'Выходим…' : 'Выйти'}
                </button>
            )}
            <TableVisual
                seatPlayers={players}
                drumPlayers={drumPlayers}
                centerText={centerText}
                highlightSectorIndex={game.lastEliminatedSectorIndex}
                spinActive={game.phase === 'playing'}
                myUserId={myUserId}
                eliminatedUserIds={eliminatedUserIds}
                eliminationFlashUserId={eliminationFlashUserId}
            />

            {readyErr && <p className={cls.readyError}>{readyErr}</p>}
            {primaryAction && (
                <TablePrimaryAction action={primaryAction} onReady={handleReady} pending={readyPending} />
            )}

            <TableInfo
                players={players}
                gameId={gameId}
                hash={hashShort}
                currency={uiCurrency}
                onCopyHash={() => copyOwnerIdToClipboard(ownerId)}
            />
        </div>
    );
}
