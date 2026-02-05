import api from './api';

export interface Promocode {
  id: string;
  promocode: string;
  currency: 'TON' | 'STARS';
  amount: number;
  countUser?: number;
  isInfinity?: boolean;
  createdAt: string;
  usageCount?: number;
}

export interface CreatePromocodeDto {
  promocode: string;
  currency: 'TON' | 'STARS';
  amount: number;
  type?: 'balance' | 'deposit';
  countUser?: number;
  isInfinity?: boolean;
}

export const promocodesService = {
  async getPromocodes(): Promise<Promocode[]> {
    const response = await api.get<Promocode[]>('/promocodes');
    return response.data;
  },

  async createPromocode(data: CreatePromocodeDto): Promise<Promocode> {
    const response = await api.post<Promocode>('/promocodes', data);
    return response.data;
  },

  async deletePromocode(id: string): Promise<void> {
    await api.delete(`/promocodes/${id}`);
  },
};
