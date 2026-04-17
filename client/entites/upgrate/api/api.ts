import * as api from '@/shared/lib/api/api';

export interface ToyChance {
    id: string;
    chance: number;
    bet: number;
    winning: number;
}

export interface PoolGift {
    name: string;
    image?: string;
    lottieUrl?: string;
    price?: number;
    pool: 'win' | 'lose';
}

export interface GetChanceResponse {
    userToys: ToyChance[];
    poolGifts: PoolGift[];
}

/** Эндпоинт: UpgrateController POST get-chance */
const GET_CHANCE_URL = '/upgrate/get-chance';
/** Эндпоинт: UpgrateController GET start-game */
const START_GAME_URL = '/upgrate/start-game';
/** Эндпоинт: UpgrateController POST set-wish-nft */
const SET_WISH_NFT_URL = '/upgrate/set-wish-nft';

export interface StartGameGift {
    id: string;
    name?: string;
    image?: string;
    price?: number;
}

export interface StartGameResponse {
    result: 'win' | 'lose';
    gifts: StartGameGift[];
}

class UpgrateService {
    async getChance(toyIds: string[], multiplier: number): Promise<GetChanceResponse> {
        const response = await api.$authHost.post<GetChanceResponse>(GET_CHANCE_URL, {
            toyIds,
            multiplier,
        });
        return response.data;
    }

    async startGame(): Promise<StartGameResponse> {
        const response = await api.$authHost.get<StartGameResponse>(START_GAME_URL);
        return response.data;
    }

    async setWishNfts(names: string[]): Promise<{ success: true; chance: number }> {
        const response = await api.$authHost.post<{ success: true; chance: number }>(SET_WISH_NFT_URL, {
            names,
        });
        return response.data;
    }
}

export const upgrateService = new UpgrateService();
