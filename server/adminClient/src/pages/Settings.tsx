import { useState, useEffect } from 'react';
import { settingsService, type GameSettings, type SettingsHistory } from '../services/settingsService';
import './Settings.css';

export default function Settings() {
  const [settings, setSettings] = useState<GameSettings>({
    soloRTP: 95,
    upgradeRTP: 90,
    wheelRTP: 95,
    pvpRake: 5,
  });
  const [history, setHistory] = useState<SettingsHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
    loadHistory();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await settingsService.getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await settingsService.getSettingsHistory();
      setHistory(data);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsService.updateSettings(settings);
      await loadHistory();
      alert('Настройки сохранены');
    } catch (error) {
      alert('Ошибка при сохранении настроек');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>Настройка параметров</h1>
        <p className="settings-note">Настройки хранятся только в Redis (ключ admin:game:settings).</p>
      </div>

      <div className="settings-form">
        <div className="form-section">
          <h2>RTP (Return to Player), %</h2>
          <p className="form-section-desc">Доля возврата игрока. Обычно 0–100.</p>
          <div className="form-group">
            <label htmlFor="soloRTP">Solo RTP (%)</label>
            <input
              id="soloRTP"
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={settings.soloRTP}
              onChange={(e) =>
                setSettings({ ...settings, soloRTP: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div className="form-group">
            <label htmlFor="upgradeRTP">Upgrade RTP (%)</label>
            <input
              id="upgradeRTP"
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={settings.upgradeRTP}
              onChange={(e) =>
                setSettings({ ...settings, upgradeRTP: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div className="form-group">
            <label htmlFor="wheelRTP">RTP колеса (%)</label>
            <input
              id="wheelRTP"
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={settings.wheelRTP}
              onChange={(e) =>
                setSettings({ ...settings, wheelRTP: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
        </div>

        <div className="form-section">
          <h2>Rake (Комиссия), %</h2>
          <div className="form-group">
            <label htmlFor="pvpRake">PVP Rake (%)</label>
            <input
              id="pvpRake"
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={settings.pvpRake}
              onChange={(e) =>
                setSettings({ ...settings, pvpRake: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
        </div>

        <button onClick={handleSave} className="save-btn" disabled={saving}>
          {saving ? 'Сохранение...' : 'Сохранить в Redis'}
        </button>
      </div>

      <div className="history-section">
        <h2>История изменений</h2>
        <div className="table-container">
          <table className="history-table">
            <thead>
              <tr>
                <th>Параметр</th>
                <th>Старое значение</th>
                <th>Новое значение</th>
                <th>Изменено</th>
                <th>Дата</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id}>
                  <td>{item.setting}</td>
                  <td>{item.oldValue}</td>
                  <td>{item.newValue}</td>
                  <td>{item.changedBy}</td>
                  <td>{new Date(item.changedAt).toLocaleString('ru-RU')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
