import api from './api';

export interface GameSettings {
  soloRTP: number;
  upgradeRTP: number;
  wheelRTP: number;
  pvpRake: number;
}

export interface SettingsHistory {
  id: string;
  setting: string;
  oldValue: number;
  newValue: number;
  changedBy: string;
  changedAt: string;
}

export const settingsService = {
  async getSettings(): Promise<GameSettings> {
    const response = await api.get<GameSettings>('/settings');
    return response.data;
  },

  async updateSettings(settings: Partial<GameSettings>): Promise<GameSettings> {
    const response = await api.patch<GameSettings>('/settings', settings);
    return response.data;
  },

  async getSettingsHistory(): Promise<SettingsHistory[]> {
    const response = await api.get<SettingsHistory[]>('/settings/history');
    return response.data;
  },
};
