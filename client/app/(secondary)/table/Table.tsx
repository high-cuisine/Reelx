'use client';

import { useUserStore } from '@/entites/user/model/user';
import { copyOwnerIdToClipboard, formatOwnerHashShort, formatTableGameId } from './helpers/ownerDisplay';
import { useEliminationFlash } from './hooks/useEliminationFlash';
import { useRedirectWhenGameFinished } from './hooks/useRedirectWhenGameFinished';
import { useTableLiveData } from './hooks/useTableLiveData';
import { useTableOwnerId } from './hooks/useTableOwnerId';
import { useTablePageDerived } from './hooks/useTablePageDerived';
import { useTablePrimaryAction } from './hooks/useTablePrimaryAction';
import cls from './Table.module.scss';
import {
    TableInfo,
    TablePageFallback,
    TablePrimaryAction,
    TableVisual,
} from './components';

export default function TablePage() {
    const ownerId = useTableOwnerId();
    const myUserId = useUserStore((s) => s.user?.userId ?? null);

    const { table, loadError, bootLoading, readyErr, emitGameReady, clearReadyErr } =
        useTableLiveData(ownerId);

    const { players, game, drumPlayers, eliminatedUserIds, centerText, uiCurrency } =
        useTablePageDerived(table);

    const primaryAction = useTablePrimaryAction(table, game, myUserId);

    const eliminationFlashUserId = useEliminationFlash(game?.lastEliminatedUserId ?? null);

    const canShowTableUi = Boolean(
        ownerId && !bootLoading && !loadError && table && game,
    );
    useRedirectWhenGameFinished(game?.phase, canShowTableUi);

    const gameId = formatTableGameId(ownerId);
    const hashShort = formatOwnerHashShort(ownerId);

    const handleReady = () => {
        clearReadyErr();
        emitGameReady();
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
                <TablePrimaryAction action={primaryAction} onReady={handleReady} />
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
