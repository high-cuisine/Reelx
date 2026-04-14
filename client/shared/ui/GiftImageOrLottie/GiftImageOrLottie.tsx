'use client';

import { useState, useEffect, useRef } from 'react';
import Image, { StaticImageData } from 'next/image';
import dynamic from 'next/dynamic';
import cls from './GiftImageOrLottie.module.scss';

const Lottie = dynamic(() => import('lottie-react').then((m) => m.default), { ssr: false });

function normalizeMediaUrl(url: string): string {
    const trimmed = url.trim();
    if (trimmed.startsWith('ipfs://')) {
        const hash = trimmed.replace('ipfs://', '');
        return `https://cloudflare-ipfs.com/ipfs/${hash}`;
    }
    if (trimmed.startsWith('//')) return `https:${trimmed}`;
    if (trimmed.startsWith('http://')) return trimmed.replace(/^http:\/\//, 'https://');
    return trimmed;
}

function isRemoteUrl(url: string): boolean {
    return /^https?:\/\//i.test(url) || url.startsWith('ipfs://') || url.startsWith('//');
}

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
    /**
     * Счётчик с родителя: при каждом изменении Lottie перемонтируется (один проход).
     * Если передан — клик по компоненту не перехватывается (удобно для кнопки-карточки).
     */
    replayNonce?: number;
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
    replayNonce,
    className,
    imageClassName,
    placeholder,
}: GiftImageOrLottieProps) => {
    const [lottieData, setLottieData] = useState<object | null>(null);
    const [replayToken, setReplayToken] = useState(0);
    const lottieContainerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!lottieUrl) {
            setLottieData(null);
            setReplayToken(0);
            return;
        }
        let cancelled = false;
        fetch(normalizeMediaUrl(lottieUrl))
            .then((r) => r.json())
            .then((data) => {
                if (!cancelled) {
                    setLottieData(data);
                    setReplayToken(0);
                }
            })
            .catch(() => {
                if (!cancelled) setLottieData(null);
            });
        return () => {
            cancelled = true;
        };
    }, [lottieUrl]);

    // Хак: для Lottie (фрагменты подарков) по флагу убираем фон:
    // берём первый <g>, который идёт после <defs>, и скрываем первые два его дочерних <g>.
    useEffect(() => {
        if (hideLottieBackground !== true || !lottieData || !lottieContainerRef.current) return;

        const hideBgLayers = () => {
            const container = lottieContainerRef.current;
            if (!container) return false;
            const svg = container.querySelector('svg');
            if (!svg) return false;

            let pastDefs = false;
            let wrapperG: Element | null = null;

            for (const child of Array.from(svg.children)) {
                if (child.tagName.toLowerCase() === 'defs') {
                    pastDefs = true;
                    continue;
                }
                if (pastDefs && child.tagName.toLowerCase() === 'g') {
                    wrapperG = child;
                    break;
                }
            }

            if (!wrapperG) return false;

            const childGs = Array.from(wrapperG.children).filter(
                (el) => el.tagName.toLowerCase() === 'g',
            );

            childGs.slice(0, 2).forEach((g) => {
                (g as unknown as SVGElement).style.display = 'none';
            });

            return true;
        };

        if (hideBgLayers()) return;

        const timeouts = [50, 120, 220].map((ms) => setTimeout(hideBgLayers, ms));
        return () => {
            timeouts.forEach((t) => clearTimeout(t));
        };
    }, [lottieData, hideLottieBackground, replayToken, replayNonce]);

    const sizeStyle = fillContainer
        ? { width: '100%', height: '100%' as const }
        : lottieData
          ? { width: '18vw', height: '18vw' as const }
          : { width: 56, height: 56 };

    if (lottieData) {
        const externalReplay = replayNonce !== undefined;
        const replayOnClick = !loop && !externalReplay;
        const lottiePlayKey = externalReplay ? replayNonce : replayToken;

        return (
            <div
                ref={lottieContainerRef}
                className={`${cls.lottieWrap} ${fillContainer ? cls.fillContainer : ''} ${className ?? ''}`}
                style={sizeStyle}
                {...(replayOnClick
                    ? {
                          'data-lottie-replay': 'true',
                          onClick: (e: React.MouseEvent) => {
                              e.stopPropagation();
                              setReplayToken((v) => v + 1);
                          },
                      }
                    : {})}
            >
                <Lottie
                    key={`${lottieUrl ?? 'lottie'}-${lottiePlayKey}`}
                    animationData={lottieData}
                    loop={loop}
                    autoplay
                    style={{
                        ...sizeStyle,
                        ...(replayOnClick || externalReplay ? { cursor: 'pointer' } : {}),
                    }}
                />
            </div>
        );
    }

    if (image) {
        const remoteSrc =
            typeof image === 'string' && isRemoteUrl(image) ? normalizeMediaUrl(image) : null;

        if (fillContainer) {
            return (
                <div className={`${cls.imageWrap} ${className ?? ''}`}>
                    {remoteSrc ? (
                        <img
                            src={remoteSrc}
                            alt={alt}
                            className={imageClassName ?? cls.imageFill}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                        />
                    ) : (
                        <Image
                            src={image}
                            alt={alt}
                            fill
                            sizes="(max-width: 480px) 33vw, 70px"
                            className={imageClassName ?? cls.imageFill}
                        />
                    )}
                </div>
            );
        }

        if (remoteSrc) {
            return (
                <img
                    src={remoteSrc}
                    alt={alt}
                    width={56}
                    height={56}
                    style={{ width: 56, height: 56 }}
                    className={imageClassName ?? cls.image}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                />
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
