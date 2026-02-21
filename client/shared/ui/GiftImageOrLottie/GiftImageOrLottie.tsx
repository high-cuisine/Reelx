'use client';

import { useState, useEffect, useRef } from 'react';
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
    className,
    imageClassName,
    placeholder,
}: GiftImageOrLottieProps) => {
    const [lottieData, setLottieData] = useState<object | null>(null);
    const lottieContainerRef = useRef<HTMLDivElement | null>(null);

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

    // Хак: для Lottie (фрагменты подарков) по флагу убираем фон:
    // берём первый <g>, который идёт после <defs>, и скрываем первые два его дочерних <g>.
    useEffect(() => {
        if (hideLottieBackground !== true || !lottieData || !lottieContainerRef.current) return;

        const hideBgLayers = () => {
            const container = lottieContainerRef.current;
            if (!container) return;
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
                (g as HTMLElement).style.display = 'none';
            });

            return true;
        };

        if (!hideBgLayers()) {
            const t = setTimeout(hideBgLayers, 50);
            return () => clearTimeout(t);
        }
    }, [lottieData, hideLottieBackground]);

    const sizeStyle = fillContainer
        ? { width: '100%', height: '100%' as const }
        : lottieData
          ? { width: '18vw', height: '18vw' as const }
          : { width: 56, height: 56 };

    if (lottieData) {
        return (
            <div
                ref={lottieContainerRef}
                className={`${cls.lottieWrap} ${fillContainer ? cls.fillContainer : ''} ${className ?? ''}`}
                style={sizeStyle}
            >
                <Lottie
                    animationData={lottieData}
                    loop
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
