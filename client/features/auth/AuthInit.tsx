'use client';

import { useEffect } from 'react';
import { authService } from './auth';
import { useUserStore } from '@/entites/user/model/user';
import { useTelegram } from '@/shared/lib/hooks/useTelegram';
import { AxiosError } from 'axios';

const BANNED_MESSAGE = 'is Banned';

export function AuthInit() {
    const { initData } = useTelegram();
    const setAuthError = useUserStore((s) => s.setAuthError);

    useEffect(() => {
        if (!initData) {
            return;
        }

        const initAuth = async () => {
            if (typeof window === 'undefined') {
                return;
            }

            const user = useUserStore.getState().user;
            if (user) {
                return;
            }

            setAuthError(null);

            authService.login(initData).catch((error: AxiosError<{ message?: string }>) => {
                const isBanned =
                    error.response?.status === 400 &&
                    (error.response?.data?.message === BANNED_MESSAGE ||
                        String(error.response?.data?.message).toLowerCase().includes('ban'));
                if (isBanned) {
                    setAuthError('banned');
                } else {
                    console.error('Failed to initialize auth:', error);
                }
            });
        };

        initAuth();
    }, [initData, setAuthError]);

    return null;
}

