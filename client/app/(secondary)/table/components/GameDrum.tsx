'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import cls from './GameDrum.module.scss';
import type { TablePlayer } from './types';

// ── Figma drum geometry ───────────────────────────────
const VB = 216;
const CX = 108;
const CY = 108;
const R_OUTER = 107;
const R_INNER = 44;   // center circle (Табло 88×88 → r=44)
const R_AVATAR = (R_OUTER + R_INNER) / 2; // 75.5 — mid-ring
const AVATAR_R = 12;

// ── Sector fill: same dark felt color for all, NOT bright ────
const SECTOR_BASE  = 'rgba(24, 16, 58, 0.88)'; // dark felt – same tone as table
const SECTOR_LIT   = 'rgba(157, 138, 243, 0.40)'; // spotlight overlay colour

// ── Roulette timing (ms per step) ────────────────────────────
const SPIN_FAST = 100;   // fast cycling speed
const SPIN_MAX  = 560;   // slowest step before stop

function polarXY(r: number, deg: number): { x: number; y: number } {
    const rad = (deg * Math.PI) / 180;
    return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function sectorArcPath(
    rO: number,
    rI: number,
    startDeg: number,
    endDeg: number,
): string {
    const large = endDeg - startDeg > 180 ? 1 : 0;
    const f = (v: number) => v.toFixed(3);
    const p1o = polarXY(rO, startDeg);
    const p2o = polarXY(rO, endDeg);
    const p2i = polarXY(rI, endDeg);
    const p1i = polarXY(rI, startDeg);
    return [
        `M ${f(p1i.x)} ${f(p1i.y)}`,
        `L ${f(p1o.x)} ${f(p1o.y)}`,
        `A ${rO} ${rO} 0 ${large} 1 ${f(p2o.x)} ${f(p2o.y)}`,
        `L ${f(p2i.x)} ${f(p2i.y)}`,
        `A ${rI} ${rI} 0 ${large} 0 ${f(p1i.x)} ${f(p1i.y)} Z`,
    ].join(' ');
}

function isRemotePhoto(url: string | null): url is string {
    return typeof url === 'string' && /^https?:\/\//i.test(url);
}

// ── Props ─────────────────────────────────────────────────────
interface GameDrumProps {
    players: TablePlayer[];
    centerText: string;
    /** Which sector is being eliminated (final highlight). null = spinning freely. */
    highlightSectorIndex?: number | null;
    /** True while the game phase is 'playing' — runs the roulette animation. */
    spinActive?: boolean;
}

// ── Component ─────────────────────────────────────────────────
export function GameDrum({
    players,
    centerText,
    highlightSectorIndex = null,
    spinActive = false,
}: GameDrumProps) {
    const n = players.length;

    // ── Roulette "lit" sector state ───────────────────────────
    const [litIndex, setLitIndex] = useState<number | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const posRef   = useRef(0);
    const stoppingRef = useRef(false);

    // keep spinActive/highlight ref-current to avoid stale closures
    const highlightRef = useRef(highlightSectorIndex);
    useLayoutEffect(() => { highlightRef.current = highlightSectorIndex; }, [highlightSectorIndex]);

    useEffect(() => {
        // Clear previous animation
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current  = null;
        stoppingRef.current = false;

        if (n < 2 || !spinActive) {
            // Static: show highlight (or nothing)
            setLitIndex(highlightSectorIndex ?? null);
            return;
        }

        if (highlightSectorIndex != null) {
            // ── Stopping sequence ────────────────────────────────
            stoppingRef.current = true;
            const target = ((highlightSectorIndex % n) + n) % n;
            // Run at least 2 full rounds then align to target
            const extra = n * 2 + ((target - posRef.current + n) % n);
            let step = 0;

            const decelTick = () => {
                if (!stoppingRef.current) return;
                posRef.current = (posRef.current + 1) % n;
                step++;
                setLitIndex(posRef.current);

                if (step < extra) {
                    const t = step / extra; // 0 → 1
                    // quadratic ease-in deceleration
                    const delay = SPIN_FAST + t * t * (SPIN_MAX - SPIN_FAST);
                    timerRef.current = setTimeout(decelTick, delay);
                }
                // done: litIndex == target (highlightSectorIndex)
            };

            timerRef.current = setTimeout(decelTick, SPIN_FAST);
        } else {
            // ── Continuous fast spin ─────────────────────────────
            const spinTick = () => {
                if (highlightRef.current != null) return; // hand off to stopping
                posRef.current = (posRef.current + 1) % n;
                setLitIndex(posRef.current);
                timerRef.current = setTimeout(spinTick, SPIN_FAST);
            };
            timerRef.current = setTimeout(spinTick, SPIN_FAST);
        }

        return () => {
            stoppingRef.current = false;
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [spinActive, highlightSectorIndex, n]);

    // ── Avatar positions ──────────────────────────────────────
    const avatarPos = players.map((_, i) => {
        const midDeg = n > 1 ? -90 + (i + 0.5) * (360 / n) : -90;
        return polarXY(R_AVATAR, midDeg);
    });

    /** Указатель на верху; поворот вокруг центра к середине подсвеченного сектора (как на барабане). */
    const pointerDeg =
        litIndex != null && n > 0 ? (n === 1 ? 0 : (litIndex + 0.5) * (360 / n)) : 0;

    // ── Render ────────────────────────────────────────────────
    return (
        <div className={cls.drumWrap}>
            <svg
                className={cls.drumSvg}
                viewBox={`0 0 ${VB} ${VB}`}
                xmlns="http://www.w3.org/2000/svg"
                overflow="hidden"
            >
                <defs>
                    <radialGradient id="dg-center" cx="50%" cy="50%" r="50%">
                        <stop offset="0%"  stopColor="#24194D" />
                        <stop offset="80%" stopColor="#24194D" />
                        <stop offset="100%" stopColor="#7456E9" />
                    </radialGradient>

                    {/* Radial glow filter for the lit sector */}
                    <filter id="dg-glow" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    {/* Clip paths for photo avatars */}
                    {avatarPos.map((ap, i) =>
                        isRemotePhoto(players[i]?.photoUrl) ? (
                            <clipPath key={`dg-clip-${i}`} id={`dg-clip-${i}`}>
                                <circle cx={ap.x} cy={ap.y} r={AVATAR_R} />
                            </clipPath>
                        ) : null,
                    )}
                </defs>

                {/* ── Base background ────────────────────────────────────── */}
                <circle cx={CX} cy={CY} r={R_OUTER} fill="#1E1249" />

                {/* ── Sectors ────────────────────────────────────────────── */}
                {n > 0 && (() => {
                    const paths = n === 1
                        ? [{ start: -90, end: 269.9 }]
                        : players.map((_, i) => ({
                            start: -90 + i * (360 / n),
                            end:   -90 + (i + 1) * (360 / n),
                        }));

                    return paths.map((seg, i) => {
                        const isLit = litIndex === i;
                        const d = sectorArcPath(R_OUTER, R_INNER, seg.start, seg.end);
                        return (
                            <g key={i}>
                                {/* Dark base sector (same colour for all — like the felt) */}
                                <path
                                    d={d}
                                    fill={SECTOR_BASE}
                                    stroke="rgba(255,255,255,0.055)"
                                    strokeWidth="0.6"
                                />
                                {/* Spotlight overlay — fades in/out with CSS transition */}
                                <path
                                    d={d}
                                    fill={SECTOR_LIT}
                                    style={{
                                        opacity: isLit ? 1 : 0,
                                        transition: isLit
                                            ? 'opacity 0.05s ease'
                                            : 'opacity 0.18s ease',
                                    }}
                                    filter="url(#dg-glow)"
                                />
                            </g>
                        );
                    });
                })()}

                {/* ── Avatar circles (on top of sectors) ───────────────── */}
                {players.map((player, i) => {
                    const ap = avatarPos[i];
                    const showPhoto = isRemotePhoto(player.photoUrl);
                    const isLit = litIndex === i;

                    return (
                        <g key={player.id}>
                            {/* Subtle glow ring when this avatar is lit */}
                            {isLit && (
                                <circle
                                    cx={ap.x} cy={ap.y}
                                    r={AVATAR_R + 4}
                                    fill="none"
                                    stroke="rgba(255,255,255,0.35)"
                                    strokeWidth="1.5"
                                    className={cls.avatarGlow}
                                />
                            )}
                            <circle
                                cx={ap.x} cy={ap.y}
                                r={AVATAR_R}
                                fill={player.color}
                                stroke="rgba(255,255,255,0.30)"
                                strokeWidth="0.6"
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

                {/* ── Outer rim ──────────────────────────────────────────── */}
                <circle cx={CX} cy={CY} r={R_OUTER - 0.5} fill="none" stroke="rgba(116,86,233,0.45)" strokeWidth="1.2" />
                <circle cx={CX} cy={CY} r={R_OUTER - 1.5} fill="none" stroke="rgba(255,255,255,0.06)"  strokeWidth="0.8" />

                {/* ── Pointer — вращается к середине сектора с подсветкой (совпадает с «выбором») ─── */}
                <g transform={`rotate(${pointerDeg} ${CX} ${CY})`}>
                    <polygon points="103,49 113,49 108,62" fill="#F2C4C4" opacity="0.95" />
                    <polygon points="103,49 113,49 108,62" fill="rgba(255,255,255,0.35)" />
                </g>

                {/* ── Centre circle (Табло) ──────────────────────────────── */}
                <circle cx={CX} cy={CY} r={R_INNER} fill="url(#dg-center)" />
                <circle cx={CX} cy={CY} r={R_INNER - 0.5} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            </svg>

            {/* Centre text overlay — пусто во время вспышки крестика на столе */}
            <div className={cls.center}>
                {centerText.trim()
                    ? centerText.split('\n').map((line, i) => (
                        <span key={i} className={cls.centerLine}>{line}</span>
                    ))
                    : null}
            </div>
        </div>
    );
}
