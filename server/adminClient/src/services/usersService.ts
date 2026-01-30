import api from './api';

export interface User {
  id: string;
  username: string;
  telegramId: string | null;
  photoUrl: string | null;
  tonBalance: number;
  starsBalance: number;
  isBanned: boolean;
  createdAt: string;
}

export interface UserFilters {
  search?: string;
  minBalance?: number;
  maxBalance?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface UpdateUserBalanceDto {
  userId: string;
  tonBalance?: number;
  starsBalance?: number;
}

export const usersService = {
  async getUsers(filters?: UserFilters): Promise<User[]> {
    const response = await api.get<User[]>('/users', { params: filters });
    return response.data;
  },

  async getUserById(userId: string): Promise<User> {
    const response = await api.get<User>(`/users/${userId}`);
    return response.data;
  },

  async banUser(userId: string): Promise<void> {
    await api.post(`/users/${userId}/ban`);
  },

  async unbanUser(userId: string): Promise<void> {
    await api.post(`/users/${userId}/unban`);
  },

  async updateBalance(data: UpdateUserBalanceDto): Promise<User> {
    const response = await api.patch<User>(`/users/${data.userId}/balance`, data);
    return response.data;
  },

  async getUserGifts(userId: string) {
    const response = await api.get(`/users/${userId}/gifts`);
    return response.data;
  },
};
