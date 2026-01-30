import { useState, useEffect } from 'react';
import { gamesService, type GameStats, type UserGameRecord } from '../services/gamesService';
import './Games.css';

export default function Games() {
  const [stats, setStats] = useState<GameStats | null>(null);
  const [games, setGames] = useState<UserGameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, gamesData] = await Promise.all([
        gamesService.getStats(filters),
        gamesService.getGames(filters),
      ]);
      setStats(statsData);
      setGames(gamesData);
    } catch (error) {
      console.error('Error loading games:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="games-page">
      <div className="page-header">
        <h1>Статистика игр (user_games)</h1>
      </div>

      <div className="filters-section">
        <input
          type="date"
          value={filters.from}
          onChange={(e) => setFilters({ ...filters, from: e.target.value })}
          className="date-input"
        />
        <input
          type="date"
          value={filters.to}
          onChange={(e) => setFilters({ ...filters, to: e.target.value })}
          className="date-input"
        />
      </div>

      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : stats ? (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">🎮</div>
              <div className="stat-info">
                <div className="stat-label">Всего игр</div>
                <div className="stat-value">{stats.totalGames}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🎯</div>
              <div className="stat-info">
                <div className="stat-label">Solo игры</div>
                <div className="stat-value">{stats.soloGames}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-info">
                <div className="stat-label">PVP игры</div>
                <div className="stat-value">{stats.pvpGames}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">⬆️</div>
              <div className="stat-info">
                <div className="stat-label">Upgrade игры</div>
                <div className="stat-value">{stats.upgradeGames}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-info">
                <div className="stat-label">Заработано (Rake + RTP)</div>
                <div className="stat-value">
                  {(stats.totalRake + stats.totalRTP).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-info">
                <div className="stat-label">Оборот (сумма ставок)</div>
                <div className="stat-value">{stats.totalTurnover.toFixed(2)}</div>
              </div>
            </div>
          </div>

          <div className="games-list-section">
            <h2>Записи user_games</h2>
            {games.length === 0 ? (
              <div className="no-data">Нет записей за выбранный период</div>
            ) : (
              <table className="games-table">
                <thead>
                  <tr>
                    <th>Дата</th>
                    <th>Пользователь</th>
                    <th>Тип</th>
                    <th>Ставка</th>
                    <th>Валюта</th>
                  </tr>
                </thead>
                <tbody>
                  {games.map((g) => (
                    <tr key={g.id}>
                      <td>{formatDate(g.createdAt)}</td>
                      <td>{g.user?.username ?? g.userId}</td>
                      <td>{g.type}</td>
                      <td>{g.priceAmount.toFixed(2)}</td>
                      <td>{g.priceType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : (
        <div className="no-data">Нет данных</div>
      )}
    </div>
  );
}
