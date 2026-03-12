import * as api from '@/shared/lib/api/api';

export interface ToyChance {
    id: string;
    chance: number;
    bet: number;
    winning: number;
}

export interface PoolGift {
    name?: string;
    image?: string;
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
}

export const upgrateService = new UpgrateService();
