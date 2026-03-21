import { useState, useCallback } from 'react';

export type CurrencyType = 'stars' | 'ton';

export const useCurrency = () => {
    const [currency, setCurrency] = useState<CurrencyType>('ton');

    const toggleCurrency = useCallback(() => {
        setCurrency(prev => prev === 'stars' ? 'ton' : 'stars');
    }, []);

    return {
        currency,
        setCurrency,
        toggleCurrency,
    };
};
