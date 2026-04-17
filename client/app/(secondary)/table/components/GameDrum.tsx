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

// ── Roulette timing (как UpgradeArena: постоянная ω → quad ease-out) ──
const FULL_DEG = 360;
/** Постоянная скорость «ожидания» (градусов в секунду) — как SPIN_SPEED в upgrate */
const SPIN_SPEED_DPS = 600;
/** Quadratic ease-out: длительность из согласования скорости v₀ = 2·D/T = SPIN_SPEED_DPS */
const MIN_EASE_MS = 1500;
const MAX_EASE_MS = 5000;
const EXTRA_TURNS = 3;

function normDeg360(a: number): number {
    return ((a % FULL_DEG) + FULL_DEG) % FULL_DEG;
}

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
    centerWinner?: TablePlayer | null;
    /** Which sector is being eliminated (final highlight). null = spinning freely. */
    highlightSectorIndex?: number | null;
    /** True while the game phase is 'playing' — runs the roulette animation. */
    spinActive?: boolean;
}

// ── Component ─────────────────────────────────────────────────
export function GameDrum({
    players,
    centerText,
    centerWinner = null,
    highlightSectorIndex = null,
    spinActive = false,
}: GameDrumProps) {
    const n = players.length;

    // ── Roulette "lit" sector state ───────────────────────────
    const [litIndex, setLitIndex] = useState<number | null>(null);
    /** Угол стрелки (°), 0..360 — как визуальный rotate SVG */
    const [pointerDeg, setPointerDeg] = useState(0);
    const pointerDegRef = useRef(0);
    pointerDegRef.current = pointerDeg;

    const spinRafRef = useRef(0);
    const lastTsRef = useRef<number | null>(null);
    /** Накопленный угол (может >360) — для фазы ease и стыковки скорости */
    const angleAccumRef = useRef(0);
    const modeRef = useRef<'fast' | 'ease'>('fast');
    const easeStartMsRef = useRef(0);
    const easeDurMsRef = useRef(2500);
    const easeStartAngRef = useRef(0);
    const easeEndAngRef = useRef(0);
    const wasSpinningRef = useRef(false);
    /** Чтобы не запускать ease повторно на том же highlight, пока сервер не сбросит сектор */
    const completedHighlightRef = useRef<number | null>(null);

    const highlightRef = useRef(highlightSectorIndex);
    useLayoutEffect(() => {
        highlightRef.current = highlightSectorIndex;
    }, [highlightSectorIndex]);

    useEffect(() => {
        if (highlightSectorIndex == null) {
            completedHighlightRef.current = null;
        }
    }, [highlightSectorIndex]);

    useEffect(() => {
        if (spinActive && !wasSpinningRef.current) {
            lastTsRef.current = null;
            modeRef.current = 'fast';
            angleAccumRef.current = pointerDegRef.current;
        }
        wasSpinningRef.current = spinActive;
    }, [spinActive]);

    useEffect(() => {
        if (n < 2 || !spinActive) {
            if (spinRafRef.current) {
                cancelAnimationFrame(spinRafRef.current);
                spinRafRef.current = 0;
            }
            lastTsRef.current = null;
            modeRef.current = 'fast';
            setLitIndex(highlightSectorIndex ?? null);
            return;
        }

        const step = (ts: number) => {
            const hi = highlightRef.current;
            const sector = FULL_DEG / n;

            if (lastTsRef.current == null) {
                lastTsRef.current = ts;
            }
            const dt = Math.min(0.05, Math.max(0, (ts - lastTsRef.current) / 1000));
            lastTsRef.current = ts;

            if (hi != null && modeRef.current === 'fast' && completedHighlightRef.current !== hi) {
                const currentNorm = normDeg360(angleAccumRef.current);
                const targetMid = ((hi + 0.5) * sector) % FULL_DEG;
                const delta = ((targetMid - currentNorm) + FULL_DEG) % FULL_DEG;
                const D = EXTRA_TURNS * FULL_DEG + delta;
                const rawEaseMs = (2 * D / SPIN_SPEED_DPS) * 1000;
                easeDurMsRef.current = Math.max(MIN_EASE_MS, Math.min(MAX_EASE_MS, rawEaseMs));
                easeStartAngRef.current = angleAccumRef.current;
                easeEndAngRef.current = angleAccumRef.current + D;
                easeStartMsRef.current = ts;
                modeRef.current = 'ease';
                setLitIndex(hi);
            }

            if (modeRef.current === 'ease') {
                const progress = Math.min(1, (ts - easeStartMsRef.current) / easeDurMsRef.current);
                const eased = 1 - (1 - progress) ** 2;
                const ang =
                    easeStartAngRef.current +
                    (easeEndAngRef.current - easeStartAngRef.current) * eased;
                angleAccumRef.current = ang;
                setPointerDeg(normDeg360(ang));
                if (hi != null) {
                    setLitIndex(hi);
                }

                if (progress >= 1) {
                    completedHighlightRef.current = highlightRef.current;
                    modeRef.current = 'fast';
                    lastTsRef.current = null;
                }
            } else {
                angleAccumRef.current += SPIN_SPEED_DPS * dt;
                const a = normDeg360(angleAccumRef.current);
                const nextLit = Math.min(n - 1, Math.floor(a / sector));
                setLitIndex(nextLit);
                setPointerDeg(a);
            }

            spinRafRef.current = requestAnimationFrame(step);
        };

        spinRafRef.current = requestAnimationFrame(step);
        return () => {
            if (spinRafRef.current) {
                cancelAnimationFrame(spinRafRef.current);
                spinRafRef.current = 0;
            }
        };
    }, [spinActive, n]);

    // Стрелка в статике — сразу на сектор, без анимации
    useEffect(() => {
        if (n < 2 || spinActive) return;
        if (spinRafRef.current) {
            cancelAnimationFrame(spinRafRef.current);
            spinRafRef.current = 0;
        }
        const li = highlightSectorIndex ?? litIndex;
        const deg =
            li != null && n > 0
                ? n === 1
                    ? 0
                    : (li + 0.5) * (360 / n)
                : 0;
        angleAccumRef.current = deg;
        setPointerDeg(deg);
    }, [n, spinActive, highlightSectorIndex, litIndex]);

    // ── Avatar positions ──────────────────────────────────────
    const avatarPos = players.map((_, i) => {
        const midDeg = n > 1 ? -90 + (i + 0.5) * (360 / n) : -90;
        return polarXY(R_AVATAR, midDeg);
    });

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

                {/* ── Pointer — вершина к ободу (наружу), не к центру; rotate вокруг (CX,CY) ─── */}
                <g transform={`rotate(${pointerDeg} ${CX} ${CY})`}>
                    <polygon points="108,40 103,53 113,53" fill="#F2C4C4" opacity="0.95" />
                    <polygon points="108,40 103,53 113,53" fill="rgba(255,255,255,0.35)" />
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
                {centerWinner && (
                    <div
                        className={cls.centerWinnerAvatar}
                        style={
                            isRemotePhoto(centerWinner.photoUrl)
                                ? undefined
                                : { background: centerWinner.color }
                        }
                    >
                        {isRemotePhoto(centerWinner.photoUrl) ? (
                            <img
                                src={centerWinner.photoUrl!}
                                alt=""
                                className={cls.centerWinnerAvatarImg}
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <span className={cls.centerWinnerAvatarInitial}>
                                {centerWinner.initial}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
