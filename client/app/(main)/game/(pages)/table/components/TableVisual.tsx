'use client';

import Image from 'next/image';
import cls from './TableVisual.module.scss';

import TableHighlights from '../assets/table-highlights.svg';

import { GameDrum } from './GameDrum';
import type { TablePlayer } from './types';

interface TableVisualProps {
    drumPlayers: TablePlayer[];
    centerText: string;
    highlightSectorIndex?: number | null;
}

export function TableVisual({
    drumPlayers,
    centerText,
    highlightSectorIndex = null,
}: TableVisualProps) {
    return (
        <div className={cls.tableWrap}>
            <div className={cls.tableGlow} />

            <div className={cls.tableOuter}>
                <div className={cls.tableBorder} />

                <div className={cls.tableFeltInner}>
                    <div className={cls.tableCenterGlow} />
                </div>

                <div className={cls.wheel}>
                    <GameDrum
                        players={drumPlayers}
                        centerText={centerText}
                        highlightSectorIndex={highlightSectorIndex}
                    />
                </div>

                <div className={cls.tableHighlights}>
                    <Image src={TableHighlights} alt="" fill sizes="316px" />
                </div>
            </div>
        </div>
    );
}
