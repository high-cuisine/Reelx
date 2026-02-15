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
    width: number;
    height: number;
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
    width,
    height,
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

    if (lottieData) {
        return (
            <div
                className={`${cls.lottieWrap} ${className ?? ''}`}
                style={{ width, height }}
            >
                <Lottie
                    animationData={lottieData}
                    loop
                    style={{ width, height }}
                />
            </div>
        );
    }

    if (image) {
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
        return <div className={cls.placeholder}>{placeholder}</div>;
    }

    return <div className={cls.placeholder}>🎁</div>;
};
