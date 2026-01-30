import { useState, useEffect } from 'react';
import { usersService, type User, type UserFilters } from '../services/usersService';
import './Users.css';

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<UserFilters>({});
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceForm, setBalanceForm] = useState({ tonBalance: 0, starsBalance: 0 });

  useEffect(() => {
    loadUsers();
  }, [filters]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await usersService.getUsers(filters);
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBan = async (userId: string) => {
    if (confirm('Забанить пользователя?')) {
      try {
        await usersService.banUser(userId);
        loadUsers();
      } catch (error) {
        alert('Ошибка при бане пользователя');
      }
    }
  };

  const handleUnban = async (userId: string) => {
    if (confirm('Разбанить пользователя?')) {
      try {
        await usersService.unbanUser(userId);
        loadUsers();
      } catch (error) {
        alert('Ошибка при разбане пользователя');
      }
    }
  };

  const handleUpdateBalance = async () => {
    if (!selectedUser) return;
    try {
      await usersService.updateBalance({
        userId: selectedUser.id,
        ...balanceForm,
      });
      setShowBalanceModal(false);
      loadUsers();
    } catch (error) {
      alert('Ошибка при обновлении баланса');
    }
  };

  const openBalanceModal = (user: User) => {
    setSelectedUser(user);
    setBalanceForm({
      tonBalance: user.tonBalance,
      starsBalance: user.starsBalance,
    });
    setShowBalanceModal(true);
  };

  return (
    <div className="users-page">
      <div className="page-header">
        <h1>Управление пользователями</h1>
      </div>

      <div className="filters-section">
        <input
          type="text"
          placeholder="Поиск по ID, нику..."
          value={filters.search || ''}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="search-input"
        />
        <input
          type="date"
          placeholder="От"
          value={filters.dateFrom || ''}
          onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
          className="date-input"
        />
        <input
          type="date"
          placeholder="До"
          value={filters.dateTo || ''}
          onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
          className="date-input"
        />
        <button onClick={() => setFilters({})} className="clear-filters-btn">
          Сбросить
        </button>
      </div>

      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : (
        <div className="table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Ник</th>
                <th>Telegram ID</th>
                <th>TON</th>
                <th>STARS</th>
                <th>Статус</th>
                <th>Дата регистрации</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className={user.isBanned ? 'user-banned' : ''}>
                  <td>{user.id.slice(0, 8)}...</td>
                  <td>{user.username}</td>
                  <td>{user.telegramId || '-'}</td>
                  <td>{user.tonBalance.toFixed(2)}</td>
                  <td>{user.starsBalance.toFixed(2)}</td>
                  <td>
                    <span className={user.isBanned ? 'status-banned' : 'status-ok'}>
                      {user.isBanned ? 'Забанен' : 'Активен'}
                    </span>
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString('ru-RU')}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        onClick={() => openBalanceModal(user)}
                        className="btn btn-primary"
                      >
                        Баланс
                      </button>
                      {user.isBanned ? (
                        <button
                          onClick={() => handleUnban(user.id)}
                          className="btn btn-success"
                        >
                          Разбан
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBan(user.id)}
                          className="btn btn-danger"
                        >
                          Бан
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showBalanceModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowBalanceModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Корректировка баланса</h2>
            <p>Пользователь: {selectedUser.username}</p>
            <div className="form-group">
              <label>TON баланс</label>
              <input
                type="number"
                value={balanceForm.tonBalance}
                onChange={(e) =>
                  setBalanceForm({ ...balanceForm, tonBalance: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div className="form-group">
              <label>STARS баланс</label>
              <input
                type="number"
                value={balanceForm.starsBalance}
                onChange={(e) =>
                  setBalanceForm({ ...balanceForm, starsBalance: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div className="modal-actions">
              <button onClick={handleUpdateBalance} className="btn btn-primary">
                Сохранить
              </button>
              <button onClick={() => setShowBalanceModal(false)} className="btn btn-secondary">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
