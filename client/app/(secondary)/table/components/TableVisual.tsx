'use client';

import Image from 'next/image';
import cls from './TableVisual.module.scss';

import TableHighlights from '../assets/table-highlights.svg';

import { GameDrum } from './GameDrum';
import { SEAT_POSITIONS } from './constants';
import type { TablePlayer } from './types';

function isRemotePhoto(url: string | null): url is string {
    return typeof url === 'string' && /^https?:\/\//i.test(url);
}

interface TableVisualProps {
    /** All participants — displayed around the table border as seats. */
    seatPlayers: TablePlayer[];
    /** Players still active in the game — shown as sectors on the drum. */
    drumPlayers: TablePlayer[];
    centerText: string;
    highlightSectorIndex?: number | null;
    /** True when game phase is 'playing' — runs the roulette animation. */
    spinActive?: boolean;
    /** Current user's userId — their seat gets a gradient ring. */
    myUserId?: string | null;
    /** Set of userIds that have been eliminated — red ring + полупрозрачность до конца игры. */
    eliminatedUserIds?: Set<string>;
    /** На 1.5 с после выбывания — центральный крестик и X под местом этого игрока. */
    eliminationFlashUserId?: string | null;
    /** Winner shown in the center when game is finished. */
    centerWinner?: TablePlayer | null;
}

export function TableVisual({
    seatPlayers,
    drumPlayers,
    centerText,
    highlightSectorIndex = null,
    spinActive = false,
    myUserId = null,
    eliminatedUserIds = new Set(),
    eliminationFlashUserId = null,
    centerWinner = null,
}: TableVisualProps) {
    return (
        <div className={cls.tableWrap}>
            {/* Glow behind the table — Figma: fill_RKDLNM #7456E9, blur 170px, opacity 0.48 */}
            <div className={cls.tableGlow} />

            <div className={cls.tableOuter}>
                {/* Border ring — Figma: inset shadow rgba(157,138,243,0.6) */}
                <div className={cls.tableBorder} />

                {/* Inner felt — Figma: Сукно x:12,y:12 292×484 */}
                <div className={cls.tableFeltInner}>
                    {/* Center purple glow — Figma: Ellipse 95 at x:108,y:204 */}
                    <div className={cls.tableCenterGlow} />
                </div>

                {/* Drum — Figma: Барабан at x:50,y:146 216×216 */}
                <div className={cls.wheel}>
                    <GameDrum
                        players={drumPlayers}
                        centerText={eliminationFlashUserId ? '' : centerText}
                        centerWinner={eliminationFlashUserId ? null : centerWinner}
                        highlightSectorIndex={highlightSectorIndex}
                        spinActive={spinActive}
                    />
                    {eliminationFlashUserId && (
                        <div
                            key={eliminationFlashUserId}
                            className={cls.eliminationCrossOverlay}
                            aria-hidden
                        >
                            <span className={cls.eliminationCross}>×</span>
                        </div>
                    )}
                </div>

                {/* Seats — Figma: Group 74 at x:32,y:44 252×420 */}
                <div className={cls.seats}>
                    {SEAT_POSITIONS.map((pos, i) => {
                        const player = i < seatPlayers.length ? seatPlayers[i] : null;
                        const isMe = player ? player.id === myUserId : false;
                        const isEliminated = player ? eliminatedUserIds.has(player.id) : false;
                        const showPhoto = player ? isRemotePhoto(player.photoUrl) : false;

                        if (!player) {
                            return (
                                <div
                                    key={i}
                                    className={cls.seat}
                                    style={{ left: pos.left, top: pos.top }}
                                >
                                    <div className={cls.seatRing} />
                                    <div className={`${cls.seatInner} ${cls.seatEmpty}`}>
                                        <span className={cls.seatPlus}>+</span>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div
                                key={player.id}
                                className={`${cls.seat} ${isEliminated ? cls.seatEliminated : ''}`}
                                style={{ left: pos.left, top: pos.top }}
                            >
                                {/* Figma stroke_LAJVZP for My, stroke_LKQR9A for Выбыл, stroke_YVQQ7Q for Other */}
                                <div
                                    className={`${cls.seatRing} ${isMe ? cls.seatRingMy : ''} ${isEliminated ? cls.seatRingEliminated : ''}`}
                                />
                                <div
                                    className={cls.seatInner}
                                    style={
                                        player && !showPhoto ? { background: player.color } : undefined
                                    }
                                >
                                    {showPhoto ? (
                                        <img
                                            src={player.photoUrl!}
                                            alt=""
                                            className={cls.seatPhoto}
                                            referrerPolicy="no-referrer"
                                        />
                                    ) : (
                                        <span className={cls.seatAvatar}>{player.initial}</span>
                                    )}
                                </div>
                                {eliminationFlashUserId === player.id && (
                                    <span className={cls.seatEliminatedLabel}>×</span>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Highlight overlay — Figma: Блики SVG, z-index top */}
                <div className={cls.tableHighlights}>
                    <Image src={TableHighlights} alt="" fill sizes="316px" />
                </div>
            </div>
        </div>
    );
}
