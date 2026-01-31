import { useRef, useState } from 'react';
import cls from './promocodes.module.scss';
import { $authHost } from '@/shared/lib/api/api';
import { useUserStore } from '@/entites/user/model/user';

const Promocodes = () => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [inputValue, setInputValue] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const updateBalance = useUserStore((s) => s.updateBalance);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
        setError(null);
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleUsePromocode();
        }
    };

    const handleUsePromocode = async () => {
        const code = inputValue.trim();
        if (!code) return;

        setError(null);
        setLoading(true);

        try {
            const { data } = await $authHost.post<{ success: boolean; amount: number; currency: string }>('/promocode/use', {
                promocode: code,
            });
            if (data.success) {
                const currency = data.currency?.toLowerCase() ?? 'ton';
                updateBalance(data.amount, currency === 'stars' ? 'stars' : 'ton');
                setInputValue('');
            }
        } catch (err: any) {
            const message = err?.response?.data?.message ?? 'Промокод не найден';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={cls.promocodes}>
            <h4>Промокод</h4>

            <p className={cls.content}>
                Свежие промокоды в канале <a href="https://t.me/ReelXGamingDevBot">@ReelX</a>
            </p>
            <div className={cls.inputContainer}>
                <input
                    type="text"
                    placeholder="Введите промокод"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleInputKeyDown}
                    ref={inputRef}
                    disabled={loading}
                />
                <button
                    className={inputValue.length > 0 ? cls.enableButton : cls.disableButton}
                    onClick={handleUsePromocode}
                    disabled={loading || !inputValue.trim()}
                >
                    {loading ? '...' : 'Использовать'}
                </button>
            </div>
            {error && <p className={cls.errorMessage}>{error}</p>}
        </div>
    );
};

export { Promocodes };