'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Image from 'next/image';
import cls from '../../upgrate.module.scss';
import upgradeArrows from '@/assets/upgrade-arrows.svg';
import upgradeIcon from '@/assets/upgrade-icon.svg';
import { formatChancePercentLabel } from '../../helpers/formatChancePercentLabel';

const CIRCLE_R = 117;
const STROKE_WIDTH = 6;
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_R;
const FULL_DEG = 360;
/** Постоянная скорость ожидания ответа — быстрый старт без задержки */
const SPIN_SPEED = 600;      // °/с
/** Quadratic ease-out: начинает ровно с SPIN_SPEED, плавно останавливается */
const MIN_EASE_MS = 1500;    // мин. длительность торможения
const MAX_EASE_MS = 5000;    // макс. длительность торможения
const RETURN_EASE_MS = 1200; // возврат в нижнюю точку при проигрыше
const LOSE_PAUSE = 1000;     // пауза при проигрыше перед возвратом
const MAX_DT_SEC = 0.05;     // защита от большого кадра при возврате с фона
const START_ANGLE = 90;      // нижняя точка (6 часов)
const CENTER = 120;
const ORBIT_R = CIRCLE_R - 10;
const ICON_HALF = 22;

function angleToPosition(angleDeg: number) {
    const rad = (angleDeg * Math.PI) / 180;
    const x = CENTER + ORBIT_R * Math.cos(rad);
    const y = CENTER + ORBIT_R * Math.sin(rad);
    return { left: x - ICON_HALF, top: y - ICON_HALF };
}

function applyIconPositionToEl(el: HTMLElement | null, angleDeg: number) {
    if (!el) return;
    const rad = (angleDeg * Math.PI) / 180;
    const left = CENTER + ORBIT_R * Math.cos(rad) - ICON_HALF;
    const top = CENTER + ORBIT_R * Math.sin(rad) - ICON_HALF;
    el.style.transform = `translate3d(${left}px, ${top}px, 0)`;
}

interface UpgradeArenaProps {
    chance: number | null;
    isLoadingChance: boolean;
    isPlaying: boolean;
    result: 'win' | 'lose' | null;
}

export function UpgradeArena({
    chance,
    isLoadingChance,
    isPlaying,
    result,
    onAnimationComplete,
}: UpgradeArenaProps & { onAnimationComplete: (result: 'win' | 'lose') => void }) {
    const percent = chance != null ? Math.min(100, Math.max(0, chance * 100)) : 0;
    const percentageLabel =
        isLoadingChance ? '…' : chance != null ? formatChancePercentLabel(chance) : '0';
    const strokeDashoffset = CIRCUMFERENCE * (1 - percent / 100);

    const [angle, setAngle] = useState(START_ANGLE);
    const iconWrapRef = useRef<HTMLDivElement | null>(null);
    const rafRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number | null>(null);
    const angleRef = useRef<number>(START_ANGLE);
    const targetAngleRef = useRef<number | null>(null);
    const easeStartRef = useRef<number | null>(null);
    const easeDurationRef = useRef<number>(2500);
    const startAngleRef = useRef<number>(START_ANGLE);
    const resultRef = useRef<'win' | 'lose' | null>(null);
    const onCompleteRef = useRef<((r: 'win' | 'lose') => void) | null>(null);
    const hasCompletedRef = useRef(false);
    const isReturningRef = useRef(false);
    const pauseStartRef = useRef<number | null>(null);
    const pendingReturnAngleRef = useRef<number | null>(null);

    useEffect(() => {
        resultRef.current = result;
        hasCompletedRef.current = false;
        isReturningRef.current = false;
        pauseStartRef.current = null;
        pendingReturnAngleRef.current = null;
    }, [result]);

    useEffect(() => {
        onCompleteRef.current = onAnimationComplete;
    }, [onAnimationComplete]);

    useEffect(() => {
        if (!isPlaying && !result) {
            angleRef.current = START_ANGLE;
            setAngle(START_ANGLE);
            targetAngleRef.current = null;
            easeStartRef.current = null;
            startAngleRef.current = START_ANGLE;
            easeDurationRef.current = 2500;
            lastTimeRef.current = null;
            rafRef.current = null;
            pauseStartRef.current = null;
            pendingReturnAngleRef.current = null;
        }
    }, [isPlaying, result]);

    /** Пока игра идёт, позицию задаёт RAF — исключаем перезапись transform ре-рендерами React */
    useLayoutEffect(() => {
        if (isPlaying) {
            applyIconPositionToEl(iconWrapRef.current, angleRef.current);
        }
    });

    /** Слабейшая вибрация Telegram в цикле, пока идёт анимация арены */
    useEffect(() => {
        if (!isPlaying) return;

        const pulse = () => {
            try {
                const impact = window.Telegram?.WebApp?.HapticFeedback?.impactOccurred;
                if (impact) {
                    // «soft» — самый мягкий стиль в Telegram; в типах SDK часто только light|medium|heavy
                    (impact as (s: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void)('soft');
                }
            } catch {
                // вне Telegram или без поддержки — тихо пропускаем
            }
        };

        pulse();
        const intervalId = window.setInterval(pulse, 220);

        return () => window.clearInterval(intervalId);
    }, [isPlaying]);

    useEffect(() => {
        if (!isPlaying) return;

        const step = (timestamp: number) => {
            // Фаза паузы при проигрыше
            if (pauseStartRef.current != null) {
                if (timestamp - pauseStartRef.current >= LOSE_PAUSE) {
                    pauseStartRef.current = null;
                    startAngleRef.current = angleRef.current;
                    targetAngleRef.current = pendingReturnAngleRef.current!;
                    easeDurationRef.current = RETURN_EASE_MS;
                    easeStartRef.current = timestamp;
                    lastTimeRef.current = timestamp;
                    pendingReturnAngleRef.current = null;
                }
                rafRef.current = requestAnimationFrame(step);
                return;
            }

            if (lastTimeRef.current == null) {
                lastTimeRef.current = timestamp;
            }
            const dt = Math.min(MAX_DT_SEC, Math.max(0, (timestamp - lastTimeRef.current) / 1000));
            lastTimeRef.current = timestamp;

            let nextAngle: number;

            if (targetAngleRef.current != null && easeStartRef.current != null) {
                // Quadratic ease-out: v(0) = 2·D/T = SPIN_SPEED (velocity-matched), v(T) = 0
                const progress = Math.min(1, (timestamp - easeStartRef.current) / easeDurationRef.current);
                const start = startAngleRef.current;
                const end = targetAngleRef.current;
                const eased = 1 - (1 - progress) ** 2;
                nextAngle = start + (end - start) * eased;

                angleRef.current = nextAngle;
                applyIconPositionToEl(iconWrapRef.current, nextAngle);

                if (progress >= 1) {
                    setAngle(nextAngle);
                    const res = resultRef.current;

                    if (res === 'lose' && !isReturningRef.current) {
                        isReturningRef.current = true;

                        const currentAngleNorm = ((nextAngle % FULL_DEG) + FULL_DEG) % FULL_DEG;
                        const localCurrent =
                            ((currentAngleNorm - START_ANGLE + FULL_DEG) % FULL_DEG + FULL_DEG) % FULL_DEG;
                        const deltaLocal = (FULL_DEG - localCurrent) % FULL_DEG;
                        const targetBackGlobal = nextAngle + deltaLocal;

                        pendingReturnAngleRef.current = targetBackGlobal;
                        pauseStartRef.current = timestamp;
                        targetAngleRef.current = null;
                        easeStartRef.current = null;

                        rafRef.current = requestAnimationFrame(step);
                        return;
                    }

                    targetAngleRef.current = null;
                    easeStartRef.current = null;
                    lastTimeRef.current = null;
                    rafRef.current = null;

                    if (res && !hasCompletedRef.current && onCompleteRef.current) {
                        hasCompletedRef.current = true;
                        onCompleteRef.current(res);
                    }
                    return;
                }
            } else {
                // Фаза ожидания: постоянная скорость, нет рывка при переходе к easing
                nextAngle = angleRef.current + SPIN_SPEED * dt;
                angleRef.current = nextAngle;
                applyIconPositionToEl(iconWrapRef.current, nextAngle);
            }

            rafRef.current = requestAnimationFrame(step);
        };

        if (rafRef.current == null) {
            rafRef.current = requestAnimationFrame(step);
        }

        return () => {
            if (rafRef.current != null) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
            lastTimeRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPlaying]);

    useEffect(() => {
        if (!isPlaying || !result || chance == null) return;
        if (targetAngleRef.current != null && easeStartRef.current != null) return;

        const filledAngle = (FULL_DEG * percent) / 100;
        const safeFilled = Math.max(0, Math.min(FULL_DEG, filledAngle));

        const currentAngle = ((angleRef.current % FULL_DEG) + FULL_DEG) % FULL_DEG;

        let targetLocal: number;
        if (result === 'win') {
            if (safeFilled <= 0) {
                targetLocal = Math.random() * FULL_DEG;
            } else {
                const margin = Math.min(10, safeFilled / 4);
                const from = margin;
                const to = safeFilled - margin;
                const span = Math.max(0, to - from);
                targetLocal = from + Math.random() * (span || 1);
            }
        } else {
            if (safeFilled >= FULL_DEG) {
                targetLocal = Math.random() * FULL_DEG;
            } else {
                const margin = 10;
                const from = safeFilled + margin;
                const to = FULL_DEG - margin;
                const span = Math.max(0, to - from);
                targetLocal = from + Math.random() * (span || 1);
            }
        }

        const targetLocalGlobal = ((targetLocal + START_ANGLE) % FULL_DEG + FULL_DEG) % FULL_DEG;
        const delta = ((targetLocalGlobal - currentAngle) + FULL_DEG) % FULL_DEG;

        // 3 полных оборота + delta до цели
        const extraTurns = 3;
        const D = extraTurns * FULL_DEG + delta;

        // Velocity-matched quad ease-out: T = 2·D / v₀
        // Начальная скорость easing = 2·D/T = SPIN_SPEED → переход без рывка
        const rawEaseMs = (2 * D / SPIN_SPEED) * 1000;
        easeDurationRef.current = Math.max(MIN_EASE_MS, Math.min(MAX_EASE_MS, rawEaseMs));

        const baseAngle = angleRef.current;
        startAngleRef.current = baseAngle;
        targetAngleRef.current = baseAngle + D;
        easeStartRef.current = performance.now();
        lastTimeRef.current = null;
    }, [result, chance, percent, isPlaying]);

    const arrowsRotation = ((angle % FULL_DEG) + FULL_DEG) % FULL_DEG;

    return (
        <div className={`${cls.arenaWrapper} ${isPlaying ? cls.arenaPlaying : ''}`.trim()}>
            <div className={cls.glow} />
            <svg
                className={cls.circleProgress}
                viewBox={`0 0 ${240} ${240}`}
                width={240}
                height={240}
            >
                <circle
                    className={cls.circleTrack}
                    cx={120}
                    cy={120}
                    r={CIRCLE_R}
                    fill="none"
                    strokeWidth={STROKE_WIDTH}
                />
                <circle
                    className={cls.circleFill}
                    cx={120}
                    cy={120}
                    r={CIRCLE_R}
                    fill="none"
                    strokeWidth={STROKE_WIDTH}
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={strokeDashoffset}
                    transform="rotate(90 120 120)"
                />
            </svg>
            <Image
                src={upgradeArrows}
                alt=""
                width={240}
                height={240}
                className={cls.arenaArrows}
                priority
            />
            <div className={cls.percentageBlock}>
                <span className={cls.percentage}>{percentageLabel}%</span>
                <span className={cls.chanceLabel}>Шанс на улучшение</span>
            </div>
            {(() => {
                const { left, top } = angleToPosition(arrowsRotation);
                const iconSrc = typeof upgradeIcon === 'string' ? upgradeIcon : (upgradeIcon as { src: string }).src;
                return (
                    <div
                        ref={iconWrapRef}
                        className={cls.upgradeIconCenter}
                        style={{
                            ...(isPlaying
                                ? {}
                                : { transform: `translate3d(${left}px, ${top}px, 0)` }),
                            willChange: isPlaying ? 'transform' : 'auto',
                        }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={iconSrc}
                            alt=""
                            width={44}
                            height={44}
                            decoding="async"
                            style={{ display: 'block', width: 44, height: 44 }}
                        />
                    </div>
                );
            })()}
        </div>
    );
}
