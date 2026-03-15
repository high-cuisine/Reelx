'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import cls from '../../upgrate.module.scss';
import upgradeArrows from '@/assets/upgrade-arrows.svg';
import upgradeIcon from '@/assets/upgrade-icon.svg';

const CIRCLE_R = 117;
const STROKE_WIDTH = 6;
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_R;
const FULL_DEG = 360;
const BASE_SPIN_SPEED = 180; // градусов в секунду (в 2 раза медленнее)
const EASE_DURATION = 2400; // мс (в 2 раза дольше замедление)
const LOSE_PAUSE = 1000; // мс паузы при проигрыше перед возвратом
const START_ANGLE = 90; // 6 часов (нижняя точка)
const CENTER = 120;
const ORBIT_R = CIRCLE_R - 10;
const ICON_HALF = 22;

/** Считает left, top иконки по углу (градусы) в пикселях арены 240x240 */
function angleToPosition(angleDeg: number) {
    const rad = (angleDeg * Math.PI) / 180;
    const x = CENTER + ORBIT_R * Math.cos(rad);
    const y = CENTER + ORBIT_R * Math.sin(rad);
    return { left: x - ICON_HALF, top: y - ICON_HALF };
}

/** Обновляет transform иконки по углу без аллокаций (для RAF) */
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
    /** 'win' | 'lose' | null — результат последней игры */
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
    const percentage = isLoadingChance ? '…' : chance != null ? Math.round(chance * 100) : 0;
    const strokeDashoffset = CIRCUMFERENCE * (1 - percent / 100);

    const [angle, setAngle] = useState(START_ANGLE);
    const iconWrapRef = useRef<HTMLDivElement | null>(null);
    const rafRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number | null>(null);
    const angleRef = useRef<number>(START_ANGLE);
    const targetAngleRef = useRef<number | null>(null);
    const easeStartRef = useRef<number | null>(null);
    const startAngleRef = useRef<number>(0);
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

    // Сбрасываем шарик в нижнюю точку, когда не играем и результата нет
    useEffect(() => {
        if (!isPlaying && !result) {
            angleRef.current = START_ANGLE;
            setAngle(START_ANGLE);
            targetAngleRef.current = null;
            easeStartRef.current = null;
            lastTimeRef.current = null;
            rafRef.current = null;
            pauseStartRef.current = null;
            pendingReturnAngleRef.current = null;
        }
    }, [isPlaying, result]);

    // Запускаем базовое вращение, когда начинается игра
    useEffect(() => {
        if (!isPlaying) {
            // Если игра закончилась, а easing ещё идёт, дадим ему доработать сам
            return;
        }

        const step = (timestamp: number) => {
            // Фаза паузы при проигрыше: шарик стоит на месте
            if (pauseStartRef.current != null) {
                if (timestamp - pauseStartRef.current >= LOSE_PAUSE) {
                    pauseStartRef.current = null;
                    startAngleRef.current = angleRef.current;
                    targetAngleRef.current = pendingReturnAngleRef.current!;
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
            const dt = (timestamp - lastTimeRef.current) / 1000;
            lastTimeRef.current = timestamp;

            let nextAngle = angleRef.current + BASE_SPIN_SPEED * dt;

            if (targetAngleRef.current != null && easeStartRef.current != null) {
                const progress = Math.min(
                    1,
                    (timestamp - easeStartRef.current) / EASE_DURATION,
                );
                const start = startAngleRef.current;
                const end = targetAngleRef.current;
                const eased = 1 - (1 - progress) * (1 - progress);
                nextAngle = start + (end - start) * eased;

                angleRef.current = nextAngle;
                applyIconPositionToEl(iconWrapRef.current, nextAngle);

                if (progress >= 1) {
                    setAngle(nextAngle);
                    const res = resultRef.current;

                    if (res === 'lose' && !isReturningRef.current) {
                        isReturningRef.current = true;

                        const currentAngleNorm =
                            ((nextAngle % FULL_DEG) + FULL_DEG) % FULL_DEG;
                        const localCurrent =
                            ((currentAngleNorm - START_ANGLE + FULL_DEG) % FULL_DEG +
                                FULL_DEG) %
                            FULL_DEG;
                        const deltaLocal = (FULL_DEG - localCurrent) % FULL_DEG;
                        const targetBackGlobal = nextAngle + deltaLocal;

                        // Встаём на паузу, запоминаем куда возвращаться
                        pendingReturnAngleRef.current = targetBackGlobal;
                        pauseStartRef.current = timestamp;
                        targetAngleRef.current = null;
                        easeStartRef.current = null;

                        rafRef.current = requestAnimationFrame(step);
                        return;
                    }

                    // Анимация полностью завершена
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
                angleRef.current = nextAngle;
                applyIconPositionToEl(iconWrapRef.current, nextAngle);
            }

            rafRef.current = requestAnimationFrame(step);
        };

        // Запускаем цикл
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

    // Когда появляется результат — один раз вычисляем целевой угол, чтобы остановиться
    useEffect(() => {
        if (!isPlaying || !result || chance == null) return;
        // если цель уже выставлена — не пересчитываем
        if (targetAngleRef.current != null && easeStartRef.current != null) return;

        const filledAngle = (FULL_DEG * percent) / 100;
        const safeFilled = Math.max(0, Math.min(FULL_DEG, filledAngle));

        // Нормализуем текущий угол в [0, 360)
        const currentAngle =
            ((angleRef.current % FULL_DEG) + FULL_DEG) % FULL_DEG;
        // Переводим в локальные координаты относительно нижней точки (START_ANGLE)
        const localCurrent =
            ((currentAngle - START_ANGLE + FULL_DEG) % FULL_DEG + FULL_DEG) %
            FULL_DEG;

        let targetLocal: number;
        if (result === 'win') {
            // Попадаем внутрь закрашенного сектора: [0, safeFilled] в локальных координатах
            if (safeFilled <= 0) {
                // На всякий случай, если шанс 0 — считаем как проигрыш
                targetLocal = Math.random() * FULL_DEG;
            } else {
                const margin = Math.min(10, safeFilled / 4);
                const from = margin;
                const to = safeFilled - margin;
                const span = Math.max(0, to - from);
                targetLocal = from + Math.random() * (span || 1);
            }
        } else {
            // Попадаем в незакрашенную часть
            if (safeFilled >= FULL_DEG) {
                // Шанс 100% — нет незакрашенной области, считаем как выигрыш
                targetLocal = Math.random() * FULL_DEG;
            } else {
                const margin = 10;
                const from = safeFilled + margin;
                const to = FULL_DEG - margin;
                const span = Math.max(0, to - from);
                targetLocal = from + Math.random() * (span || 1);
            }
        }

        // Переводим локальный угол обратно в глобальные координаты
        const targetLocalGlobal =
            ((targetLocal + START_ANGLE) % FULL_DEG + FULL_DEG) % FULL_DEG;

        // Хотим сделать ещё пару полных оборотов перед остановкой
        const extraTurns = 3;
        const baseAngle = angleRef.current;
        const targetGlobal =
            baseAngle +
            (extraTurns * FULL_DEG + (targetLocalGlobal - currentAngle));

        startAngleRef.current = baseAngle;
        targetAngleRef.current = targetGlobal;
        easeStartRef.current = performance.now();
        // lastTimeRef сбросим, чтобы easing работал от текущего времени
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
                <span className={cls.percentage}>{percentage}%</span>
                <span className={cls.chanceLabel}>Шанс на улучшение</span>
            </div>
            {/** Иконка: обёртка с translate3d (GPU), внутри обычный img без Next/Image для меньшей нагрузки */}
            {(() => {
                const { left, top } = angleToPosition(arrowsRotation);
                const iconSrc = typeof upgradeIcon === 'string' ? upgradeIcon : (upgradeIcon as { src: string }).src;
                return (
                    <div
                        ref={iconWrapRef}
                        className={cls.upgradeIconCenter}
                        style={{
                            transform: `translate3d(${left}px, ${top}px, 0)`,
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
