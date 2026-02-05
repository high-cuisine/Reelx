import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../libs/infrustructure/redis/redis.service';

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

@Injectable()
export class AdminSettingsRepository {
  private readonly SETTINGS_KEY = 'admin:game:settings';
  private readonly SETTINGS_HISTORY_KEY = 'admin:game:settings:history';

  constructor(private readonly redisService: RedisService) {}

  async getSettings(): Promise<GameSettings> {
    const settings = await this.redisService.get(this.SETTINGS_KEY);
    if (settings) {
      return JSON.parse(settings);
    }

    const defaultSettings: GameSettings = {
      soloRTP: 95,
      upgradeRTP: 90,
      wheelRTP: 95,
      pvpRake: 5,
    };

    await this.redisService.set(this.SETTINGS_KEY, JSON.stringify(defaultSettings));
    return defaultSettings;
  }

  async setSettings(settings: Partial<GameSettings>): Promise<GameSettings> {
    const currentSettings = await this.getSettings();
    const newSettings: GameSettings = {
      ...currentSettings,
      ...settings,
    };

    await this.redisService.set(this.SETTINGS_KEY, JSON.stringify(newSettings));

    // Сохраняем историю изменений
    const changes = Object.keys(settings).map(key => ({
      setting: key,
      oldValue: currentSettings[key as keyof GameSettings],
      newValue: newSettings[key as keyof GameSettings],
    }));

    for (const change of changes) {
      if (change.oldValue !== change.newValue) {
        await this.addToHistory({
          id: Date.now().toString(),
          setting: change.setting,
          oldValue: change.oldValue,
          newValue: change.newValue,
          changedBy: 'admin', // TODO: получить из сессии
          changedAt: new Date().toISOString(),
        });
      }
    }

    return newSettings;
  }

  async getHistory(): Promise<SettingsHistory[]> {
    const history = await this.redisService.get(this.SETTINGS_HISTORY_KEY);
    if (!history) {
      return [];
    }

    const historyArray = JSON.parse(history);
    // Ограничиваем историю последними 100 записями
    return historyArray.slice(-100);
  }

  private async addToHistory(entry: SettingsHistory): Promise<void> {
    const history = await this.getHistory();
    history.push(entry);

    // Ограничиваем историю последними 100 записями
    const limitedHistory = history.slice(-100);

    await this.redisService.set(
      this.SETTINGS_HISTORY_KEY,
      JSON.stringify(limitedHistory),
    );
  }
}
