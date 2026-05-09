import * as api from '@/shared/lib/api/api';
import { GiftItem } from '../interfaces/giftItem.interface';

export interface MinPriceResponse {
    ton: number;
    stars: number;
}

interface GetGiftsResponse {
    success: boolean;
    amount: number;
    gifts: GiftItem[];
    count: number;
}

type RawGift =
    | {
        type?: string;
        price?: string | number;
        image?: string;
        name?: string;
      }
    | Record<string, unknown>;

interface StartGameResponse {
    type: 'gift' | 'money' | 'secret' | 'telegram-gift';
    name: string;
    price: number;
    image?: string;
    giftId?: string;
    telegramGiftId?: string;
    address?: string;
    collectionAddress?: string;
    amount?: number;
    currencyType?: 'ton' | 'star';
    realType?: 'gift' | 'money';
}

class GiftsService {
    async getGiftsByPrice(body?: { amount?: number; type?: 'ton' | 'stars' }): Promise<GiftItem[]> {
      
        const response = await api.$authHost.post('/gifts/by-price', body || {});

        const rawData = response.data as unknown;
        const rawGifts: RawGift[] = Array.isArray(rawData)
            ? (rawData as RawGift[])
            : ((rawData as GetGiftsResponse)?.gifts ?? []);

        return rawGifts.map((raw: RawGift): GiftItem => {
            const rawType = (raw as any).type;
            const rawPrice = (raw as any).price;
            const rawName = (raw as any).name;
            const rawImage = (raw as any).image;
            const rawLottie = (raw as any).lottie;
            const rawTelegramGiftId = (raw as any).telegramGiftId as string | undefined;

            const nameStr =
                rawName === null || rawName === undefined
                    ? ''
                    : typeof rawName === 'string'
                      ? rawName
                      : typeof rawName === 'number' || typeof rawName === 'boolean'
                        ? String(rawName)
                        : '';

            const priceNumber =
                typeof rawPrice === 'string'
                    ? Number(rawPrice) / 1_000_000_000
                    : Number(rawPrice ?? 0);

            const isMoney = rawType === 'ton' || rawType === 'star' || rawType === 'money';

            if (rawType === 'telegram-gift') {
                return {
                    type: 'telegram-gift',
                    price: priceNumber,
                    image: rawImage || '',
                    name: nameStr.trim() || 'Gift',
                    ...(rawTelegramGiftId ? { telegramGiftId: rawTelegramGiftId } : {}),
                    ...(rawLottie ? { lottie: rawLottie } : {}),
                };
            }

            if (isMoney) {
                // Проверяем name, если он уже есть и это STARS или TON, используем его
                // Иначе определяем по rawType или по умолчанию TON
                let currencyLabel = 'TON';
                const upper = nameStr.trim().toUpperCase();
                if (upper === 'STARS' || upper === 'TON') {
                    currencyLabel = upper;
                } else if (rawType === 'star' || rawType === 'STARS') {
                    currencyLabel = 'STARS';
                } else if (rawType === 'ton' || rawType === 'TON') {
                    currencyLabel = 'TON';
                }
                
                return {
                    type: 'money',
                    price: priceNumber,
                    image: rawImage || '',
                    name: currencyLabel,
                    ...(rawLottie ? { lottie: rawLottie } : {}),
                };
            }

            return {
                type: rawType === 'secret' ? 'secret' : 'gift',
                price: priceNumber,
                image: rawImage || '',
                name: nameStr.trim() || 'Gift',
                ...(rawLottie ? { lottie: rawLottie } : {}),
            };
        });
    }

    async startGame(): Promise<StartGameResponse> {
        const response = await api.$authHost.post<StartGameResponse>('/gifts/start-game');
        return response.data;
    }

    async getMinPrice(): Promise<MinPriceResponse> {
        const response = await api.$host.get<MinPriceResponse>('/gifts/min-price');
        return response.data;
    }
}

export const giftsService = new GiftsService();