'use client';

import { useEffect } from 'react';
import { authService } from './auth';
import { useUserStore } from '@/entites/user/model/user';
import { useTelegram } from '@/shared/lib/hooks/useTelegram';

export function AuthInit() {
    const { initData } = useTelegram();

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

          //  const existingToken = localStorage.getItem('accessToken');
            // if (existingToken) {
            //     return;
            // }

            authService.login(initData)
                .catch((error) => {
                    console.error('Failed to initialize auth:', error);
                });
        };

        initAuth();
    }, [initData]);

    return null;
}

