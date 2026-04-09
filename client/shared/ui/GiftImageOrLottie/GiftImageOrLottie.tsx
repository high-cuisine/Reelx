'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image, { StaticImageData } from 'next/image';
import dynamic from 'next/dynamic';
import cls from './GiftImageOrLottie.module.scss';

const Lottie = dynamic(() => import('lottie-react').then((m) => m.default), { ssr: false });

interface GiftImageOrLottieProps {
    image?: string | StaticImageData;
    lottieUrl?: string;
    alt: string;
    width?: number;
    height?: number;
    /** Заполнять родительский контейнер (100% width/height). Для списка призов. */
    fillContainer?: boolean;
    /** Скрывать фоновые слои в Lottie (первые два <g> после <defs>). Если не передан — фон не трогаем. */
    hideLottieBackground?: boolean;
    /** Зацикливать анимацию (по умолчанию да). */
    loop?: boolean;
    className?: string;
    imageClassName?: string;
    placeholder?: React.ReactNode;
}

/**
 * Показывает картинку сразу, затем в фоне грузит Lottie по URL и при успехе подменяет картинку на анимацию.
 */
export const GiftImageOrLottie = ({
    image,
    lottieUrl,
    alt,
    width = 0,
    height = 0,
    fillContainer = false,
    hideLottieBackground,
    loop = true,
    className,
    imageClassName,
    placeholder,
}: GiftImageOrLottieProps) => {
    const [lottieData, setLottieData] = useState<object | null>(null);
    const lottieContainerRef = useRef<HTMLDivElement | null>(null);
    const [playId, setPlayId] = useState(0);

    useEffect(() => {
        if (!lottieUrl) {
            setLottieData(null);
            return;
        }
        let cancelled = false;
        fetch(lottieUrl)
            .then((r) => r.json())
            .then((data) => {
                if (!cancelled) setLottieData(data);
            })
            .catch(() => {
                if (!cancelled) setLottieData(null);
            });
        return () => {
            cancelled = true;
        };
    }, [lottieUrl]);

    useEffect(() => {
        if (!lottieData) return;
        setPlayId((v) => v + 1);
    }, [lottieData]);

    // Убираем фоновые слои из SVG, которые lottie-react рендерит.
    // Нужно перезапускать после каждого remount (playId), потому что
    // key={playId} пересоздаёт DOM и старые скрытия теряются.
    useEffect(() => {
        if (hideLottieBackground !== true || !lottieData || !lottieContainerRef.current) return;

        const hideBgLayers = () => {
            const container = lottieContainerRef.current;
            if (!container) return false;
            const svg = container.querySelector('svg');
            if (!svg) return false;

            let found = false;

            // 1) rect на весь viewBox — частый вариант подложки
            const viewBox = svg.getAttribute('viewBox');
            if (viewBox) {
                const parts = viewBox.split(/\s+/).map((p) => Number(p));
                const vbW = parts.length === 4 ? parts[2] : null;
                const vbH = parts.length === 4 ? parts[3] : null;
                if (vbW && vbH) {
                    Array.from(svg.querySelectorAll('rect')).forEach((r) => {
                        const w = Number(r.getAttribute('width'));
                        const h = Number(r.getAttribute('height'));
                        const x = Number(r.getAttribute('x') ?? '0');
                        const y = Number(r.getAttribute('y') ?? '0');
                        const hasStroke = r.getAttribute('stroke') && r.getAttribute('stroke') !== 'none';
                        if (!hasStroke && x === 0 && y === 0 && w === vbW && h === vbH) {
                            (r as unknown as SVGElement).style.display = 'none';
                            found = true;
                        }
                    });
                }
            }

            // 2) Находим первый <g> после <defs>, внутри него скрываем первые 2 дочерних <g>.
            // Структура: <svg> → <defs/> → <g clip-path> → [<g фон1>, <g фон2>, <g контент>...]
            let firstGAfterDefs: Element | null = null;
            let pastDefs = false;
            for (const child of Array.from(svg.children)) {
                const tag = child.tagName.toLowerCase();
                if (tag === 'defs') { pastDefs = true; continue; }
                if (pastDefs && tag === 'g') { firstGAfterDefs = child; break; }
            }
            if (firstGAfterDefs) {
                const childGs = Array.from(firstGAfterDefs.children).filter(
                    (el) => el.tagName.toLowerCase() === 'g',
                );
                childGs.slice(0, 2).forEach((g) => {
                    (g as unknown as SVGElement).style.display = 'none';
                });
                found = true;
            }

            return found;
        };

        // SVG может ещё не появиться в DOM — пробуем несколько раз
        let attempts = 0;
        const maxAttempts = 10;
        const tryHide = () => {
            if (hideBgLayers()) return;
            attempts++;
            if (attempts < maxAttempts) {
                requestAnimationFrame(tryHide);
            }
        };
        requestAnimationFrame(tryHide);
    }, [lottieData, hideLottieBackground, playId]);

    const sizeStyle = fillContainer
        ? { width: '100%', height: '100%' as const }
        : lottieData
          ? { width: '18vw', height: '18vw' as const }
          : { width: 56, height: 56 };

    const handleReplay = useCallback(() => {
        if (!lottieData) return;
        setPlayId((v) => v + 1);
    }, [lottieData]);

    if (lottieData) {
        return (
            <div
                ref={lottieContainerRef}
                className={`${cls.lottieWrap} ${fillContainer ? cls.fillContainer : ''} ${className ?? ''}`}
                style={sizeStyle}
                onClick={loop ? undefined : handleReplay}
            >
                <Lottie
                    key={playId}
                    animationData={lottieData}
                    loop={loop}
                    autoplay
                    style={sizeStyle}
                />
            </div>
        );
    }

    if (image) {
        if (fillContainer) {
            return (
                <div className={`${cls.imageWrap} ${className ?? ''}`}>
                    <Image
                        src={image}
                        alt={alt}
                        fill
                        sizes="(max-width: 480px) 33vw, 70px"
                        className={imageClassName ?? cls.imageFill}
                    />
                </div>
            );
        }
        return (
            <Image
                src={image}
                alt={alt}
                width={56}
                height={56}
                style={{ width: 56, height: 56 }}
                className={imageClassName ?? cls.image}
            />
        );
    }

    if (placeholder) {
        return (
            <div className={`${cls.placeholder} ${fillContainer ? cls.fillContainer : ''} ${className ?? ''}`}>
                {placeholder}
            </div>
        );
    }

    return (
        <div className={`${cls.placeholder} ${fillContainer ? cls.fillContainer : ''} ${className ?? ''}`}>
            🎁
        </div>
    );
};
