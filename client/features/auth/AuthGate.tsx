'use client';

import { useUserStore } from '@/entites/user/model/user';
import { Error } from '@/widgets/error/error';

interface AuthGateProps {
    children: React.ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
    const authError = useUserStore((s) => s.authError);

    if (authError === 'banned') {
        return (
            <Error
                errorText="Аккаунт заблокирован"
                errorSubText="Ваш аккаунт был заблокирован. Обратитесь в поддержку."
            />
        );
    }

    return <>{children}</>;
}
