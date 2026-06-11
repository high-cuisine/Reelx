'use client'
import { useEffect, useState } from 'react';
import cls from './Wheel.module.scss'
import { generateConicGradient } from '../../helpers/generateConicGradient';
import {
    buildWheelGroups,
    computeGroupVisualSizes,
    getGroupCenterAngleDeg,
} from '../../helpers/wheelGeometry';
import { GiftItem } from '@/entites/gifts/interfaces/giftItem.interface';
import { GiftImageOrLottie } from '@/shared/ui/GiftImageOrLottie/GiftImageOrLottie';
import { MoneyBadge } from './MoneyBadge';
import { useWheelLogic } from '../../hooks/useWheelLogic';

interface WheelProps {
    items: GiftItem[];
    isSpinning?: boolean;
    onSpinComplete?: (selectedItem: GiftItem) => void;
    targetIndex?: number | null;
}

const Wheel = ({
    items,
    isSpinning: externalIsSpinning,
    onSpinComplete,
    targetIndex,
}: WheelProps) => {
    const [lottieReplayByKey, setLottieReplayByKey] = useState<Record<string, number>>({});

    useEffect(() => {
        setLottieReplayByKey({});
    }, [items]);

    const {
        wheelRef,
        isDragging,
        rotation,
        isSpinning,
    } = useWheelLogic({
        items,
        externalIsSpinning,
        onSpinComplete,
        targetIndex,
    });

    const totalItemsCount = items.length;
    const groups = buildWheelGroups(items);

    useEffect(() => {
        if (!isSpinning) return;

        const triggerLightHaptic = () => {
            try {
                window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
            } catch {
                // Ignore haptic errors to avoid affecting spin UX
            }
        };

        // Start immediately and continue with a soft pulse while spinning.
        triggerLightHaptic();
        const intervalId = window.setInterval(triggerLightHaptic, 180);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [isSpinning]);

    // Сектора с игрушками (type === 'gift') — разная ширина, вариация ±20%
    let conicGradient = 'none';
    const groupVisualSizes =
        totalItemsCount > 0
            ? computeGroupVisualSizes(groups, totalItemsCount)
            : groups.map((g) => g.count);

    if (totalItemsCount > 0) {
        conicGradient = generateConicGradient(totalItemsCount, groupVisualSizes);
    }

    return (
        <div className={cls.wheelContainer}>
            <div className={cls.infoContainer}>
                <span>Ожидание</span>
            </div>
            <div className={cls.winningTriangle}>
                <svg width="31" height="29" viewBox="0 0 31 29" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Вершина к ободу (вверх), не внутрь колеса — отражение по вертикали вокруг центра viewBox */}
                    <g transform="translate(15.5 14.5) scale(1 -1) translate(-15.5 -14.5)">
                        <g filter="url(#filter0_d_1107_1888)">
                            <path
                                d="M17.665 18C16.5103 20 13.6235 20 12.4688 18L6.40664 7.5C5.25194 5.5 6.69532 3 9.00472 3L21.1291 3C23.4385 3 24.8819 5.5 23.7271 7.5L17.665 18Z"
                                fill="white"
                            />
                        </g>
                    </g>
                    <defs>
                        <filter id="filter0_d_1107_1888" x="0" y="0" width="30.1338" height="28.5" filterUnits="userSpaceOnUse">
                            <feFlood floodOpacity="0" result="BackgroundImageFix" />
                            <feColorMatrix
                                in="SourceAlpha"
                                type="matrix"
                                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                                result="hardAlpha"
                            />
                            <feOffset dy="3" />
                            <feGaussianBlur stdDeviation="3" />
                            <feComposite in2="hardAlpha" operator="out" />
                            <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0" />
                            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1107_1888" />
                            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1107_1888" result="shape" />
                        </filter>
                    </defs>
                </svg>
            </div>

            <div className={cls.wheelRing} aria-hidden>
                <svg width="353" height="353" viewBox="0 0 353 353" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g filter="url(#filter0_i_spin_wheel_ring)">
                        <path
                            d="M176.5 0C273.978 0 353 79.0217 353 176.5C353 273.978 273.978 353 176.5 353C79.0217 353 0 273.978 0 176.5C0 79.0217 79.0217 0 176.5 0ZM176.5 12C85.6492 12 12 85.6492 12 176.5C12 267.351 85.6492 341 176.5 341C267.351 341 341 267.351 341 176.5C341 85.6492 267.351 12 176.5 12Z"
                            fill="white"
                            fillOpacity="0.03"
                        />
                        <path
                            d="M176.5 0C273.978 0 353 79.0217 353 176.5C353 273.978 273.978 353 176.5 353C79.0217 353 0 273.978 0 176.5C0 79.0217 79.0217 0 176.5 0ZM176.5 12C85.6492 12 12 85.6492 12 176.5C12 267.351 85.6492 341 176.5 341C267.351 341 341 267.351 341 176.5C341 85.6492 267.351 12 176.5 12Z"
                            fill="#3A2F78"
                        />
                        <path
                            d="M176.5 0C273.978 0 353 79.0217 353 176.5C353 273.978 273.978 353 176.5 353C79.0217 353 0 273.978 0 176.5C0 79.0217 79.0217 0 176.5 0ZM176.5 12C85.6492 12 12 85.6492 12 176.5C12 267.351 85.6492 341 176.5 341C267.351 341 341 267.351 341 176.5C341 85.6492 267.351 12 176.5 12Z"
                            fill="#1E1735"
                            fillOpacity="0.2"
                        />
                    </g>
                    <defs>
                        <filter
                            id="filter0_i_spin_wheel_ring"
                            x="0"
                            y="0"
                            width="353"
                            height="353"
                            filterUnits="userSpaceOnUse"
                            colorInterpolationFilters="sRGB"
                        >
                            <feFlood floodOpacity="0" result="BackgroundImageFix" />
                            <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                            <feColorMatrix
                                in="SourceAlpha"
                                type="matrix"
                                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                                result="hardAlpha"
                            />
                            <feOffset />
                            <feGaussianBlur stdDeviation="3" />
                            <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
                            <feColorMatrix
                                type="matrix"
                                values="0 0 0 0 0.615686 0 0 0 0 0.541176 0 0 0 0 0.952941 0 0 0 0.6 0"
                            />
                            <feBlend mode="normal" in2="shape" result="effect1_innerShadow_spin_wheel_ring" />
                        </filter>
                    </defs>
                </svg>
            </div>

            <div
                ref={wheelRef}
                className={`${cls.wheel} ${isDragging ? cls.dragging : ''} ${!isSpinning ? cls.interactive : ''}`}
                style={{
                    background: conicGradient,
                    transform: `rotate(${rotation}deg)`,
                    transition: 'none',
                }}>
                {groups.map((group, index) => {
                    // Позиция по центру сектора с учётом переменной ширины (±20% для игрушек)
                    const centerAngleDeg = getGroupCenterAngleDeg(
                        index,
                        groupVisualSizes,
                        totalItemsCount,
                    );
                    const radian = (centerAngleDeg * Math.PI) / 180;
                    const radius = 35;
                    const x = 50 + radius * Math.cos(radian - Math.PI / 2);
                    const y = 50 + radius * Math.sin(radian - Math.PI / 2);
                    const item = group.item;
                    const segmentLabel = String(item.name ?? '');
                    const isNoLoot = item.type === 'no-loot' || segmentLabel === 'No loot';
                    const segmentKey =
                        item.type === 'telegram-gift' && item.telegramGiftId
                            ? `tg-${item.telegramGiftId}-${item.price}-${index}`
                            : `${item.type}-${item.name}-${item.price}-${index}`;
                    const hasLottie = Boolean(item.lottie);

                    return (
                        <div
                            key={segmentKey}
                            className={cls.segmentContent}
                            style={{
                                position: 'absolute',
                                top: `${y}%`,
                                left: `${x}%`,
                                transform: `translate(-50%, -50%) rotate(${-rotation}deg)`,
                            }}
                        >
                            {isNoLoot ? (
                                <svg width="21" height="56" viewBox="0 0 21 56" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                    <path d="M0.116204 1.66396L6.92246 0.028462L7.23554 1.33137L3.29998 6.52462L3.14811 5.89261L8.04862 4.71506L8.42245 6.27077L1.61619 7.90627L1.30544 6.61308L5.23867 1.41011L5.39054 2.04212L0.490032 3.21967L0.116204 1.66396ZM3.00794 14.2118C2.87866 13.6738 2.84623 13.1536 2.91066 12.6513C2.97665 12.1555 3.12795 11.7009 3.36458 11.2875C3.60277 10.8806 3.91319 10.5318 4.29584 10.241C4.68005 9.95668 5.12496 9.75378 5.63056 9.63228C6.13617 9.51079 6.62469 9.48939 7.09613 9.56809C7.56912 9.65327 8.00493 9.82623 8.40355 10.087C8.80217 10.3477 9.14351 10.684 9.42756 11.0956C9.71161 11.5073 9.9175 11.979 10.0452 12.5105C10.1745 13.0485 10.2054 13.5622 10.1378 14.0515C10.0718 14.5473 9.91976 14.9987 9.68157 15.4056C9.44494 15.819 9.1353 16.1711 8.75265 16.4619C8.37648 16.7511 7.93235 16.9572 7.42026 17.0803C6.91466 17.2018 6.42211 17.2207 5.94264 17.1371C5.46965 17.0519 5.03384 16.8789 4.63522 16.6182C4.24464 16.3624 3.90732 16.0286 3.62327 15.6169C3.34078 15.2117 3.13567 14.7433 3.00794 14.2118ZM4.34741 13.8796C4.42062 14.1843 4.53945 14.4506 4.70391 14.6785C4.86993 14.9128 5.07354 15.1039 5.31473 15.2516C5.55593 15.3993 5.82187 15.4931 6.11256 15.533C6.4048 15.5793 6.71298 15.5635 7.03709 15.4857C7.3612 15.4078 7.6429 15.2818 7.88218 15.1078C8.12303 14.9402 8.31732 14.7358 8.46506 14.4946C8.61435 14.2599 8.7097 14.0004 8.75111 13.7162C8.79252 13.432 8.77662 13.1376 8.70342 12.8329C8.63021 12.5283 8.5106 12.2587 8.34458 12.0244C8.18012 11.7965 7.97729 11.6087 7.73609 11.461C7.4949 11.3132 7.22818 11.2162 6.93593 11.1699C6.64524 11.13 6.33784 11.149 6.01374 11.2269C5.69611 11.3032 5.41364 11.4259 5.16631 11.5951C4.92702 11.7691 4.73273 11.9735 4.58343 12.2082C4.4357 12.4494 4.34112 12.7121 4.29971 12.9963C4.2583 13.2805 4.2742 13.575 4.34741 13.8796ZM5.61747 24.558L12.4237 22.9225L12.8022 24.4976L7.27944 25.8247L8.09952 29.2376L6.81606 29.546L5.61747 24.558ZM8.00496 35.0073C7.87568 34.4693 7.84325 33.9492 7.90768 33.4469C7.97367 32.9511 8.12497 32.4965 8.3616 32.0831C8.59979 31.6762 8.91021 31.3273 9.29286 31.0365C9.67707 30.7522 10.122 30.5493 10.6276 30.4278C11.1332 30.3063 11.6217 30.2849 12.0932 30.3636C12.5661 30.4488 13.002 30.6218 13.4006 30.8825C13.7992 31.1433 14.1405 31.4795 14.4246 31.8912C14.7086 32.3029 14.9145 32.7745 15.0422 33.306C15.1715 33.8441 15.2024 34.3577 15.1349 34.8471C15.0689 35.3429 14.9168 35.7942 14.6786 36.2011C14.442 36.6145 14.1323 36.9666 13.7497 37.2574C13.3735 37.5466 12.9294 37.7528 12.4173 37.8758C11.9117 37.9973 11.4191 38.0163 10.9397 37.9326C10.4667 37.8475 10.0309 37.6745 9.63224 37.4137C9.24166 37.1579 8.90434 36.8242 8.62029 36.4125C8.3378 36.0072 8.13269 35.5389 8.00496 35.0073ZM9.34443 34.6752C9.41764 34.9799 9.53647 35.2461 9.70094 35.474C9.86696 35.7084 10.0706 35.8994 10.3118 36.0472C10.5529 36.1949 10.8189 36.2887 11.1096 36.3285C11.4018 36.3749 11.71 36.3591 12.0341 36.2812C12.3582 36.2033 12.6399 36.0774 12.8792 35.9033C13.1201 35.7357 13.3143 35.5313 13.4621 35.2902C13.6114 35.0554 13.7067 34.796 13.7481 34.5118C13.7895 34.2276 13.7736 33.9331 13.7004 33.6285C13.6272 33.3238 13.5076 33.0543 13.3416 32.8199C13.1771 32.5921 12.9743 32.4042 12.7331 32.2565C12.4919 32.1088 12.2252 32.0117 11.933 31.9654C11.6423 31.9255 11.3349 31.9446 11.0108 32.0224C10.6931 32.0988 10.4107 32.2215 10.1633 32.3906C9.92404 32.5647 9.72975 32.7691 9.58045 33.0038C9.43272 33.245 9.33815 33.5077 9.29674 33.7919C9.25533 34.0761 9.27122 34.3705 9.34443 34.6752ZM10.3034 44.5726C10.1741 44.0345 10.1417 43.5144 10.2061 43.0121C10.2721 42.5163 10.4234 42.0617 10.6601 41.6483C10.8982 41.2414 11.2087 40.8925 11.5913 40.6018C11.9755 40.3175 12.4204 40.1146 12.926 39.9931C13.4316 39.8716 13.9202 39.8502 14.3916 39.9289C14.8646 40.014 15.3004 40.187 15.699 40.4478C16.0976 40.7085 16.439 41.0447 16.723 41.4564C17.0071 41.8681 17.213 42.3397 17.3407 42.8713C17.47 43.4093 17.5008 43.923 17.4333 44.4123C17.3673 44.9081 17.2152 45.3594 16.977 45.7664C16.7404 46.1798 16.4308 46.5318 16.0481 46.8226C15.672 47.1119 15.2278 47.318 14.7157 47.4411C14.2101 47.5625 13.7176 47.5815 13.2381 47.4979C12.7651 47.4127 12.3293 47.2397 11.9307 46.979C11.5401 46.7231 11.2028 46.3894 10.9187 45.9777C10.6363 45.5725 10.4311 45.1041 10.3034 44.5726ZM11.6429 44.2404C11.7161 44.5451 11.8349 44.8113 11.9994 45.0392C12.1654 45.2736 12.369 45.4646 12.6102 45.6124C12.8514 45.7601 13.1173 45.8539 13.408 45.8938C13.7003 45.9401 14.0085 45.9243 14.3326 45.8464C14.6567 45.7686 14.9384 45.6426 15.1777 45.4685C15.4185 45.301 15.6128 45.0966 15.7605 44.8554C15.9098 44.6207 16.0052 44.3612 16.0466 44.077C16.088 43.7928 16.0721 43.4984 15.9989 43.1937C15.9257 42.889 15.8061 42.6195 15.6401 42.3852C15.4756 42.1573 15.2728 41.9695 15.0316 41.8217C14.7904 41.674 14.5237 41.577 14.2314 41.5306C13.9407 41.4908 13.6333 41.5098 13.3092 41.5877C12.9916 41.664 12.7091 41.7867 12.4618 41.9559C12.2225 42.1299 12.0282 42.3343 11.8789 42.569C11.7312 42.8102 11.6366 43.0729 11.5952 43.3571C11.5538 43.6413 11.5697 43.9358 11.6429 44.2404ZM12.2401 52.1188L17.7629 50.7917L17.2396 48.6137L18.523 48.3053L19.9483 54.2364L18.6648 54.5448L18.1414 52.3668L12.6186 53.6939L12.2401 52.1188Z" fill="white"/>
                                </svg>
                            ) : item.type === 'money' ? (
                                <MoneyBadge item={item} />
                            ) : item.type === 'telegram-gift' ? (
                                item.image || item.lottie ? (
                                    <div
                                        className={`${cls.segmentMedia} ${cls.segmentMediaTelegramGift} ${hasLottie && !isSpinning ? cls.segmentMediaReplayable : ''}`}
                                        role={hasLottie && !isSpinning ? 'button' : undefined}
                                        tabIndex={hasLottie && !isSpinning ? 0 : undefined}
                                        onPointerDown={
                                            hasLottie && !isSpinning ? (e) => e.stopPropagation() : undefined
                                        }
                                        onTouchStart={
                                            hasLottie && !isSpinning ? (e) => e.stopPropagation() : undefined
                                        }
                                        onClick={
                                            hasLottie && !isSpinning
                                                ? (e) => {
                                                      e.stopPropagation();
                                                      setLottieReplayByKey((prev) => ({
                                                          ...prev,
                                                          [segmentKey]: (prev[segmentKey] ?? 0) + 1,
                                                      }));
                                                  }
                                                : undefined
                                        }
                                    >
                                        <GiftImageOrLottie
                                            image={item.image}
                                            lottieUrl={item.lottie}
                                            alt={item.name}
                                            fillContainer
                                            hideLottieBackground
                                            loop={false}
                                            replayNonce={
                                                hasLottie ? (lottieReplayByKey[segmentKey] ?? 0) : undefined
                                            }
                                            className={cls.segmentLottie}
                                            imageClassName={`${cls.segmentImage} ${cls.segmentImageTelegramGift}`}
                                        />
                                    </div>
                                ) : (
                                    <div className={cls.segmentMedia}>
                                        <span className={cls.segmentEmojiGift}>{segmentLabel}</span>
                                    </div>
                                )
                            ) : item.image || item.lottie ? (
                                <div
                                    className={`${cls.segmentMedia} ${hasLottie && !isSpinning ? cls.segmentMediaReplayable : ''}`}
                                    role={hasLottie && !isSpinning ? 'button' : undefined}
                                    tabIndex={hasLottie && !isSpinning ? 0 : undefined}
                                    onPointerDown={
                                        hasLottie && !isSpinning ? (e) => e.stopPropagation() : undefined
                                    }
                                    onTouchStart={
                                        hasLottie && !isSpinning ? (e) => e.stopPropagation() : undefined
                                    }
                                    onClick={
                                        hasLottie && !isSpinning
                                            ? (e) => {
                                                  e.stopPropagation();
                                                  setLottieReplayByKey((prev) => ({
                                                      ...prev,
                                                      [segmentKey]: (prev[segmentKey] ?? 0) + 1,
                                                  }));
                                              }
                                            : undefined
                                    }
                                    onKeyDown={
                                        hasLottie && !isSpinning
                                            ? (e) => {
                                                  if (e.key === 'Enter' || e.key === ' ') {
                                                      e.preventDefault();
                                                      e.stopPropagation();
                                                      setLottieReplayByKey((prev) => ({
                                                          ...prev,
                                                          [segmentKey]: (prev[segmentKey] ?? 0) + 1,
                                                      }));
                                                  }
                                              }
                                            : undefined
                                    }
                                >
                                    <GiftImageOrLottie
                                        image={item.image}
                                        lottieUrl={item.lottie}
                                        alt={item.name}
                                        fillContainer
                                        hideLottieBackground
                                        loop={false}
                                        replayNonce={hasLottie ? (lottieReplayByKey[segmentKey] ?? 0) : undefined}
                                        className={cls.segmentLottie}
                                        imageClassName={cls.segmentImage}
                                    />
                                </div>
                            ) : (
                                <span className={cls.segmentText}>
                                    {segmentLabel.includes('#') ? (
                                        <>
                                            <span className={cls.segmentTextTitle}>{segmentLabel.split('#')[0]}</span>
                                            <span className={cls.segmentTextSubtitle}>#{segmentLabel.split('#')[1]}</span>
                                        </>
                                    ) : (
                                        <span className={cls.segmentTextTitle}>{segmentLabel}</span>
                                    )}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export { Wheel }