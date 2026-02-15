import { useCallback, useRef, useState } from 'react';
import { eventBus, MODAL_EVENTS } from '@/features/eventBus/eventBus';
import { giftsService } from '@/entites/gifts/api/api';
import { GiftItem } from '@/entites/gifts/interfaces/giftItem.interface';
import { updateUserBalance } from '@/features/user/user';

interface GameResult {
    selectedItem: GiftItem;
    rolls: number;
    totalPrice: number;
}

interface StartGameResult {
    prize: GiftItem | null;
    targetIndex: number | null;
    isLoading: boolean;
    error: string | null;
}

export const useGameResult = () => {
    const [startGameState, setStartGameState] = useState<StartGameResult>({
        prize: null,
        targetIndex: null,
        isLoading: false,
        error: null,
    });
    const giftIdRef = useRef<string | null>(null);

    const startGame = useCallback(async (wheelItems: GiftItem[]): Promise<number | null> => {
        if (wheelItems.length === 0) {
            console.error('Wheel items are empty');
            return null;
        }

        setStartGameState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const result = await giftsService.startGame();
            
            // При выигрыше валюты обновляем баланс пользователя в сторе
            if (result.type === 'money' || (result.type === 'secret' && result.realType === 'money')) {
                const amount = result.amount ?? result.price ?? 0;
                const currency =
                    result.currencyType === 'star'
                        ? 'stars'
                        : 'ton';

                if (amount > 0 && currency) {
                    updateUserBalance(amount, currency);
                }
            }

            // Находим индекс приза в колесе по имени и типу
            const targetIndex = wheelItems.findIndex((item) => {
                if (result.type === 'money') {
                    const currencyName = result.currencyType === 'ton' ? 'TON' : 'STARS';
                    // Для money сравниваем по типу и имени, а также по цене (amount)
                    return item.type === 'money' && 
                           item.name === currencyName && 
                           Math.abs(item.price - (result.amount || result.price)) < 0.0001;
                }
                if (result.type === 'secret') {
                    // Для secret сравниваем по типу и имени
                    // Если realType='money', то сравниваем по имени валюты
                    if (result.realType === 'money') {
                        const currencyName = result.currencyType === 'ton' ? 'TON' : 'STARS';
                        return item.type === 'secret' && 
                               item.name === currencyName &&
                               Math.abs(item.price - (result.amount || result.price)) < 0.0001;
                    }
                    // Если realType='gift', сравниваем по имени подарка
                    return item.type === 'secret' && item.name === result.name;
                }
                // Для gift сравниваем по имени и цене
                return item.type === 'gift' && 
                       item.name === result.name &&
                       Math.abs(item.price - result.price) < 0.0001;
            });

            if (targetIndex === -1) {
                console.warn('Prize not found in wheel items, using random index');
                giftIdRef.current = null;
                const randomIndex = Math.floor(Math.random() * wheelItems.length);
                setStartGameState({
                    prize: wheelItems[randomIndex],
                    targetIndex: randomIndex,
                    isLoading: false,
                    error: null,
                });
                return randomIndex;
            }

            giftIdRef.current = result.giftId ?? null;

            // Преобразуем результат сервера в GiftItem (lottie берём из элемента колеса)
            const wheelItem = wheelItems[targetIndex];
            const prize: GiftItem = {
                type: result.type,
                name: result.name,
                price: result.price,
                image: result.image || '',
                ...(wheelItem?.lottie ? { lottie: wheelItem.lottie } : {}),
            };

            setStartGameState({
                prize,
                targetIndex,
                isLoading: false,
                error: null,
            });

            return targetIndex;
        } catch (error: any) {
            giftIdRef.current = null;
            console.error('Ошибка при старте игры:', error);

            // Обрабатываем ошибку недостаточного баланса
            if (error?.response?.status === 402 || error?.response?.status === 400) {
                const errorMessage = error?.response?.data?.message || error?.message || 'Недостаточный баланс';
                alert(errorMessage);
            } else {
                const errorMessage = error?.message || 'Ошибка при старте игры';
                alert(errorMessage);
            }
            
            setStartGameState(prev => ({
                ...prev,
                isLoading: false,
                error: error?.response?.data?.message || error?.message || 'Ошибка при старте игры',
            }));
            return null;
        }
    }, []);

    const handleGameComplete = useCallback((result: GameResult) => {
        console.log('Игра завершена:', result);

        const isNoLoot = result.selectedItem.type === 'no-loot' || result.selectedItem.name === 'No loot';
        if (isNoLoot) {
            giftIdRef.current = null;
            setStartGameState({
                prize: null,
                targetIndex: null,
                isLoading: false,
                error: null,
            });
            return;
        }

        const giftId = giftIdRef.current;

        // Открываем модальное окно с результатом
        eventBus.emit(MODAL_EVENTS.OPEN_WIN_MODAL, {
            selectedItem: {
                name: result.selectedItem.name,
                price: result.selectedItem.price,
                image: result.selectedItem.image,
                lottie: result.selectedItem.lottie,
            },
            rolls: result.rolls,
            totalPrice: result.totalPrice,
            giftId: giftId ?? undefined,
        });

        giftIdRef.current = null;

        // Сбрасываем состояние после завершения игры
        setStartGameState({
            prize: null,
            targetIndex: null,
            isLoading: false,
            error: null,
        });
    }, []);

    return {
        startGame,
        handleGameComplete,
        startGameState,
    };
};
