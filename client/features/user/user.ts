import { useUserStore } from '@/entites/user/model/user';

export type UserBalanceCurrency = 'ton' | 'stars';

/**
 * Обновляет баланс пользователя в сторе на указанную величину
 * для конкретной валюты (TON или STARS).
 *
 * amount — это приращение (может быть положительным или отрицательным).
 */
export const updateUserBalance = (amount: number, currency: UserBalanceCurrency) => {
    if (!amount) return;

    useUserStore.getState().updateBalance(amount, currency);
};

