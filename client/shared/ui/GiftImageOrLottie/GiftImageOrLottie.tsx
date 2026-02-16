'use client';

import { useState, useEffect } from 'react';
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
    className,
    imageClassName,
    placeholder,
}: GiftImageOrLottieProps) => {
    const [lottieData, setLottieData] = useState<object | null>(null);

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

    const sizeStyle = fillContainer
        ? { width: '100%', height: '100%' as const }
        : { width, height };

    if (lottieData) {
        return (
            <div
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
                width={width}
                height={height}
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
