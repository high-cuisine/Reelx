'use client';

import cls from './GameDrum.module.scss';
import type { TablePlayer } from './types';

const SECTOR_COLORS = [
    '#3b5ba9',
    '#7456e9',
    '#2eb8b8',
    '#6b4c9a',
    '#4caf50',
    '#c94c9c',
    '#e67e22',
    '#1abc9c',
];

function isRemotePhoto(url: string | null): url is string {
    return typeof url === 'string' && /^https?:\/\//i.test(url);
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function sectorPath(
    cx: number,
    cy: number,
    rOuter: number,
    rInner: number,
    startDeg: number,
    endDeg: number,
): string {
    const large = endDeg - startDeg > 180 ? 1 : 0;
    const p1o = polar(cx, cy, rOuter, startDeg);
    const p2o = polar(cx, cy, rOuter, endDeg);
    const p2i = polar(cx, cy, rInner, endDeg);
    const p1i = polar(cx, cy, rInner, startDeg);
    return [
        `M ${p1i.x} ${p1i.y}`,
        `L ${p1o.x} ${p1o.y}`,
        `A ${rOuter} ${rOuter} 0 ${large} 1 ${p2o.x} ${p2o.y}`,
        `L ${p2i.x} ${p2i.y}`,
        `A ${rInner} ${rInner} 0 ${large} 0 ${p1i.x} ${p1i.y}`,
        'Z',
    ].join(' ');
}

interface GameDrumProps {
    players: TablePlayer[];
    centerText: string;
    /** Подсветка сектора (индекс в текущем массиве players). */
    highlightSectorIndex?: number | null;
}

export function GameDrum({ players, centerText, highlightSectorIndex }: GameDrumProps) {
    const n = players.length;
    const vb = 100;
    const cx = vb / 2;
    const cy = vb / 2;
    const rOuter = 48;
    const rInner = 30;

    return (
        <div className={cls.drumWrap}>
            <div className={cls.pointer} aria-hidden />
            <svg
                className={cls.drumSvg}
                viewBox={`0 0 ${vb} ${vb}`}
                xmlns="http://www.w3.org/2000/svg"
            >
                {n === 0 && (
                    <circle cx={cx} cy={cy} r={rOuter - 2} className={cls.emptyCircle} />
                )}
                {n === 1 && (
                    <>
                        <circle
                            cx={cx}
                            cy={cy}
                            r={rOuter - 0.5}
                            fill={SECTOR_COLORS[0]}
                            className={`${cls.sector} ${
                                highlightSectorIndex === 0 ? cls.sectorHot : ''
                            }`}
                        />
                    </>
                )}
                {n > 1 &&
                    players.map((player, i) => {
                        const slice = 360 / n;
                        const start = -90 + i * slice;
                        const end = -90 + (i + 1) * slice;
                        const mid = (start + end) / 2;
                        const color = SECTOR_COLORS[i % SECTOR_COLORS.length];
                        const hot = highlightSectorIndex === i;
                        const labelR = (rOuter + rInner) / 2;
                        const lp = polar(cx, cy, labelR, mid);
                        const showPhoto = isRemotePhoto(player.photoUrl);
                        return (
                            <g key={player.id}>
                                <path
                                    d={sectorPath(cx, cy, rOuter, rInner, start, end)}
                                    fill={color}
                                    className={`${cls.sector} ${hot ? cls.sectorHot : ''}`}
                                />
                                <foreignObject
                                    x={lp.x - 6}
                                    y={lp.y - 6}
                                    width={12}
                                    height={12}
                                    className={cls.avatarFo}
                                >
                                    <div
                                        className={cls.avatarSlot}
                                        style={
                                            showPhoto
                                                ? undefined
                                                : { background: player.color }
                                        }
                                    >
                                        {showPhoto ? (
                                            <img
                                                src={player.photoUrl!}
                                                alt=""
                                                className={cls.avatarImg}
                                                referrerPolicy="no-referrer"
                                            />
                                        ) : (
                                            <span className={cls.avatarLetter}>
                                                {player.initial}
                                            </span>
                                        )}
                                    </div>
                                </foreignObject>
                            </g>
                        );
                    })}
            </svg>
            <div className={cls.center}>
                <span className={cls.centerText}>{centerText}</span>
            </div>
        </div>
    );
}
