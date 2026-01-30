import api from './api';

export interface GameStats {
  totalGames: number;
  soloGames: number;
  pvpGames: number;
  upgradeGames: number;
  totalRake: number;
  totalRTP: number;
  totalTurnover: number;
  period: {
    from: string;
    to: string;
  };
}

export interface GameFilters {
  from?: string;
  to?: string;
  type?: 'solo' | 'pvp' | 'upgrade';
}

export interface UserGameRecord {
  id: string;
  userId: string;
  type: string;
  priceAmount: number;
  priceType: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
  };
}

export const gamesService = {
  async getStats(filters?: GameFilters): Promise<GameStats> {
    const response = await api.get<GameStats>('/games/stats', { params: filters });
    return response.data;
  },

  async getGames(filters?: GameFilters): Promise<UserGameRecord[]> {
    const response = await api.get<UserGameRecord[]>('/games', { params: filters });
    return response.data;
  },
};
