'use client';

import Image from 'next/image';
import cls from './TableVisual.module.scss';

import TableHighlights from '../assets/table-highlights.svg';
import WheelSectors from '../assets/wheel-sectors.svg';
import WheelRim from '../assets/wheel-rim.svg';

import { SEAT_POSITIONS } from './constants';
import type { TablePlayer } from './types';

function isRemotePhoto(url: string | null): url is string {
    return typeof url === 'string' && /^https?:\/\//i.test(url);
}

interface TableVisualProps {
    players: TablePlayer[];
    statusText?: string;
}

export function TableVisual({ players, statusText = 'Ожидание' }: TableVisualProps) {
    return (
        <div className={cls.tableWrap}>
            <div className={cls.tableGlow} />

            <div className={cls.tableOuter}>
                <div className={cls.tableBorder} />

                <div className={cls.tableFeltInner}>
                    <div className={cls.tableCenterGlow} />
                </div>

                <div className={cls.wheel}>
                    <div className={cls.wheelSectors}>
                        <Image src={WheelSectors} alt="" fill sizes="214px" />
                    </div>
                    <div className={cls.wheelRim}>
                        <Image src={WheelRim} alt="" fill sizes="216px" />
                    </div>
                    <div className={cls.wheelStatus}>
                        <span className={cls.wheelStatusText}>{statusText}</span>
                    </div>
                </div>

                <div className={cls.seats}>
                    {SEAT_POSITIONS.map((pos, i) => {
                        const player = i < players.length ? players[i] : null;
                        const showPhoto = player ? isRemotePhoto(player.photoUrl) : false;
                        return (
                            <div key={i} className={cls.seat} style={{ left: pos.left, top: pos.top }}>
                                <div className={cls.seatRing} />
                                <div
                                    className={`${cls.seatInner} ${!player ? cls.seatEmpty : ''}`}
                                    style={
                                        player && !showPhoto ? { background: player.color } : undefined
                                    }
                                >
                                    {player ? (
                                        showPhoto ? (
                                            <img
                                                src={player.photoUrl!}
                                                alt=""
                                                className={cls.seatPhoto}
                                                referrerPolicy="no-referrer"
                                            />
                                        ) : (
                                            <span className={cls.seatAvatar}>{player.initial}</span>
                                        )
                                    ) : (
                                        <span className={cls.seatPlus}>+</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className={cls.tableHighlights}>
                    <Image src={TableHighlights} alt="" fill sizes="316px" />
                </div>
            </div>
        </div>
    );
}
