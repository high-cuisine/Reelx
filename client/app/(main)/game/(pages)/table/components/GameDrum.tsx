'use client';

import cls from './GameDrum.module.scss';
import type { TablePlayer } from './types';

// Figma fill colors for players: fill_C6OJ8Q=#199CB3, fill_P6E4D4=#1775CD, etc.
const SECTOR_COLORS = [
    '#199CB3', // teal
    '#1775CD', // blue
    '#640E8C', // violet
    '#45720D', // green
    '#C24B8D', // pink
    '#B07B12', // amber
    '#1A6B5B', // dark-teal
    '#5B4FC6', // indigo
];

// Figma drum: 216×216, center at (108,108)
const VB = 216;
const CX = 108;
const CY = 108;
const R_OUTER = 107; // outer sector radius (sectors fill x:1,y:1 = 214px circle)
const R_INNER = 44;  // inner circle edge (Табло: 88x88 at x:64,y:64 → r=44)
const R_AVATAR = (R_OUTER + R_INNER) / 2; // 75.5 — mid-ring, where avatars sit
const AVATAR_R = 12; // avatar circle radius in SVG units

function polarXY(r: number, angleDeg: number): { x: number; y: number } {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function sectorArcPath(
    rOuter: number,
    rInner: number,
    startDeg: number,
    endDeg: number,
): string {
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    const p1o = polarXY(rOuter, startDeg);
    const p2o = polarXY(rOuter, endDeg);
    const p2i = polarXY(rInner, endDeg);
    const p1i = polarXY(rInner, startDeg);
    const f = (n: number) => n.toFixed(3);
    return [
        `M ${f(p1i.x)} ${f(p1i.y)}`,
        `L ${f(p1o.x)} ${f(p1o.y)}`,
        `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${f(p2o.x)} ${f(p2o.y)}`,
        `L ${f(p2i.x)} ${f(p2i.y)}`,
        `A ${rInner} ${rInner} 0 ${largeArc} 0 ${f(p1i.x)} ${f(p1i.y)}`,
        'Z',
    ].join(' ');
}

function isRemotePhoto(url: string | null): url is string {
    return typeof url === 'string' && /^https?:\/\//i.test(url);
}

interface GameDrumProps {
    players: TablePlayer[];
    centerText: string;
    /** Index in `players` array that is being eliminated (highlighted). */
    highlightSectorIndex?: number | null;
}

export function GameDrum({ players, centerText, highlightSectorIndex }: GameDrumProps) {
    const n = players.length;

    // Pre-compute avatar positions so we can reuse them in defs and render
    const avatarPos = players.map((_, i) => {
        const midDeg = n > 1 ? -90 + (i + 0.5) * (360 / n) : 0;
        return polarXY(R_AVATAR, midDeg);
    });

    return (
        <div className={cls.drumWrap}>
            <svg
                className={cls.drumSvg}
                viewBox={`0 0 ${VB} ${VB}`}
                xmlns="http://www.w3.org/2000/svg"
                overflow="hidden"
            >
                <defs>
                    {/* Radial gradient for center circle (Табло) — Figma: fill_Y8OHWA */}
                    <radialGradient id="dg-center" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#24194D" />
                        <stop offset="80%" stopColor="#24194D" />
                        <stop offset="100%" stopColor="#7456E9" />
                    </radialGradient>

                    {/* Clip paths for photo avatars */}
                    {avatarPos.map((ap, i) =>
                        isRemotePhoto(players[i]?.photoUrl) ? (
                            <clipPath key={`dg-clip-${i}`} id={`dg-clip-${i}`}>
                                <circle cx={ap.x} cy={ap.y} r={AVATAR_R} />
                            </clipPath>
                        ) : null,
                    )}
                </defs>

                {/* Drum background — Figma fill_OMK35P: rgba(36,25,77,0.2) + #3D2E78 */}
                <circle cx={CX} cy={CY} r={R_OUTER} fill="#2A1D60" />

                {/* ── Sectors ─────────────────────────────────────────── */}

                {n === 0 && (
                    <circle cx={CX} cy={CY} r={R_OUTER} fill="rgba(36,25,77,0.5)" />
                )}

                {n === 1 && (() => {
                    const hot = highlightSectorIndex === 0;
                    const ap = avatarPos[0] ?? polarXY(R_AVATAR, -90);
                    const p = players[0];
                    const showPhoto = isRemotePhoto(p.photoUrl);
                    return (
                        <>
                            {/* Single player — full donut */}
                            <path
                                d={sectorArcPath(R_OUTER, R_INNER, -90, 269.9)}
                                fill={SECTOR_COLORS[0]}
                                stroke="rgba(20,15,45,0.5)"
                                strokeWidth="0.5"
                                className={hot ? cls.sectorHot : cls.sector}
                            />
                            {/* Avatar */}
                            <circle cx={ap.x} cy={ap.y} r={AVATAR_R} fill={p.color} stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
                            {showPhoto ? (
                                <image href={p.photoUrl!} x={ap.x - AVATAR_R} y={ap.y - AVATAR_R} width={AVATAR_R * 2} height={AVATAR_R * 2} clipPath="url(#dg-clip-0)" preserveAspectRatio="xMidYMid slice" />
                            ) : (
                                <text x={ap.x} y={ap.y} className={cls.avatarText}>{p.initial}</text>
                            )}
                        </>
                    );
                })()}

                {n > 1 && players.map((player, i) => {
                    const sliceDeg = 360 / n;
                    const startDeg = -90 + i * sliceDeg;
                    const endDeg = -90 + (i + 1) * sliceDeg;
                    const color = SECTOR_COLORS[i % SECTOR_COLORS.length];
                    const hot = highlightSectorIndex === i;
                    const ap = avatarPos[i];
                    const showPhoto = isRemotePhoto(player.photoUrl);

                    return (
                        <g key={player.id}>
                            <path
                                d={sectorArcPath(R_OUTER, R_INNER, startDeg, endDeg)}
                                fill={color}
                                stroke="rgba(20,15,45,0.5)"
                                strokeWidth="0.5"
                                className={`${cls.sector} ${hot ? cls.sectorHot : ''}`}
                            />
                            {/* Avatar circle on sector */}
                            <circle
                                cx={ap.x}
                                cy={ap.y}
                                r={AVATAR_R}
                                fill={player.color}
                                stroke="rgba(255,255,255,0.35)"
                                strokeWidth="0.5"
                            />
                            {showPhoto ? (
                                <image
                                    href={player.photoUrl!}
                                    x={ap.x - AVATAR_R}
                                    y={ap.y - AVATAR_R}
                                    width={AVATAR_R * 2}
                                    height={AVATAR_R * 2}
                                    clipPath={`url(#dg-clip-${i})`}
                                    preserveAspectRatio="xMidYMid slice"
                                />
                            ) : (
                                <text x={ap.x} y={ap.y} className={cls.avatarText}>
                                    {player.initial}
                                </text>
                            )}
                        </g>
                    );
                })}

                {/* ── Outer rim border — Figma: Кант SVG overlay ──────── */}
                <circle cx={CX} cy={CY} r={R_OUTER - 0.5} fill="none" stroke="rgba(69,52,136,0.7)" strokeWidth="1" />
                <circle cx={CX} cy={CY} r={R_OUTER - 0.5} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

                {/* ── Pointer (Указатель) — Figma: x:103,y:53, 10×10 polygon, fill_TQ3IR3 */}
                {/* Downward-pointing triangle in top sector area */}
                <polygon
                    points="103,49 113,49 108,62"
                    fill="#ED6D6D"
                    opacity="0.92"
                />
                <polygon
                    points="103,49 113,49 108,62"
                    fill="rgba(255,255,255,0.45)"
                />

                {/* ── Center circle (Табло) — Figma: x:64,y:64, 88×88, fill_Y8OHWA ── */}
                <circle cx={CX} cy={CY} r={R_INNER} fill="url(#dg-center)" />
                {/* Inner circle subtle border */}
                <circle cx={CX} cy={CY} r={R_INNER - 0.5} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            </svg>

            {/* Center text (foreignObject replacement — absolute overlay div) */}
            <div className={cls.center}>
                {centerText.split('\n').map((line, i) => (
                    <span key={i} className={cls.centerLine}>{line}</span>
                ))}
            </div>
        </div>
    );
}
