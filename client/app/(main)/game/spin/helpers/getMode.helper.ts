import { CurrencyType } from "../hooks/useCurrency";

export function getMode(currency: CurrencyType, totalPrice: number): 'normal' | 'mystery' | 'multy' {
    if(currency === 'stars' && totalPrice > 250) {
        return 'mystery';
    } else if(currency === 'ton' && totalPrice > 10) {
        return 'mystery';
    } else if(currency === 'stars' && totalPrice > 50) {
        return 'multy';
    } else if(currency === 'ton' && totalPrice > 50) {
        return 'multy';
    }
    return 'normal';
}