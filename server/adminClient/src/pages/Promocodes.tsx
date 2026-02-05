import { useState, useEffect } from 'react';
import { promocodesService, type Promocode, type CreatePromocodeDto } from '../services/promocodesService';
import './Promocodes.css';

const initialFormData: CreatePromocodeDto = {
  promocode: '',
  currency: 'TON',
  amount: 0,
  type: 'balance',
  countUser: 1,
  isInfinity: false,
};

export default function Promocodes() {
  const [promocodes, setPromocodes] = useState<Promocode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<CreatePromocodeDto>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadPromocodes();
  }, []);

  const loadPromocodes = async () => {
    setLoading(true);
    try {
      const data = await promocodesService.getPromocodes();
      setPromocodes(data);
    } catch (error) {
      console.error('Error loading promocodes:', error);
    } finally {
      setLoading(false);
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    const code = formData.promocode.trim();
    if (!code) errors.promocode = 'Введите промокод';
    if (formData.amount < 0) errors.amount = 'Сумма не может быть отрицательной';
    if (!formData.isInfinity && (formData.countUser ?? 1) < 1) {
      errors.countUser = 'Минимум 1 использование';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setCreating(true);
    try {
      await promocodesService.createPromocode(formData);
      setShowCreateModal(false);
      setFormData(initialFormData);
      setFormErrors({});
      loadPromocodes();
    } catch (error) {
      alert('Ошибка при создании промокода');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить промокод?')) return;
    try {
      await promocodesService.deletePromocode(id);
      loadPromocodes();
    } catch (error) {
      alert('Ошибка при удалении промокода');
    }
  };

  const closeModal = () => {
    if (!creating) {
      setShowCreateModal(false);
      setFormData(initialFormData);
      setFormErrors({});
    }
  };

  return (
    <div className="promocodes-page">
      <div className="page-header">
        <h1>Управление промокодами</h1>
        <button onClick={() => setShowCreateModal(true)} className="create-btn">
          Создать промокод
        </button>
      </div>

      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : promocodes.length === 0 ? (
        <div className="empty-state">
          <p>Промокодов пока нет</p>
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
            Создать первый промокод
          </button>
        </div>
      ) : (
        <div className="table-container">
          <table className="promocodes-table">
            <thead>
              <tr>
                <th>Промокод</th>
                <th>Валюта</th>
                <th>Сумма</th>
                <th>Использовано</th>
                <th>Лимит</th>
                <th>Дата создания</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {promocodes.map((promo) => (
                <tr key={promo.id}>
                  <td>
                    <code className="promocode-code">{promo.promocode}</code>
                  </td>
                  <td>{promo.currency}</td>
                  <td>{promo.amount.toFixed(2)}</td>
                  <td>{promo.usageCount ?? 0}</td>
                  <td className="limit-cell">{promo.isInfinity ? '∞' : (promo.countUser ?? 1)}</td>
                  <td>{new Date(promo.createdAt).toLocaleDateString('ru-RU')}</td>
                  <td>
                    <button
                      onClick={() => handleDelete(promo.id)}
                      className="btn btn-danger"
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content promocodes-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Создать промокод</h2>
              <button
                type="button"
                className="modal-close"
                onClick={closeModal}
                disabled={creating}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>

            <div className="form-group">
              <label htmlFor="promocode-input">Промокод *</label>
              <input
                id="promocode-input"
                type="text"
                value={formData.promocode}
                onChange={(e) => {
                  setFormData({ ...formData, promocode: e.target.value });
                  if (formErrors.promocode) setFormErrors((e) => ({ ...e, promocode: '' }));
                }}
                placeholder="PROMO123"
                className={formErrors.promocode ? 'input-error' : ''}
              />
              {formErrors.promocode && (
                <span className="form-error">{formErrors.promocode}</span>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="promo-currency">Валюта</label>
                <select
                  id="promo-currency"
                  value={formData.currency}
                  onChange={(e) =>
                    setFormData({ ...formData, currency: e.target.value as 'TON' | 'STARS' })
                  }
                >
                  <option value="TON">TON</option>
                  <option value="STARS">STARS</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="promo-amount">Сумма *</label>
                <input
                  id="promo-amount"
                  type="number"
                  step="0.01"
                  min={0}
                  value={formData.amount}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 0;
                    setFormData({ ...formData, amount: v });
                    if (formErrors.amount) setFormErrors((e) => ({ ...e, amount: '' }));
                  }}
                  className={formErrors.amount ? 'input-error' : ''}
                />
                {formErrors.amount && (
                  <span className="form-error">{formErrors.amount}</span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Тип бонуса</label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value as 'balance' | 'deposit' })
                }
              >
                <option value="balance">Бонус к балансу</option>
                <option value="deposit">Бонус при пополнении</option>
              </select>
            </div>

            <div className="form-group limit-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.isInfinity ?? false}
                  onChange={(e) =>
                    setFormData({ ...formData, isInfinity: e.target.checked })
                  }
                />
                <span>Безлимитное использование</span>
              </label>
              {!formData.isInfinity && (
                <div className="limit-input-wrap">
                  <label htmlFor="promo-count">Количество использований на пользователя</label>
                  <input
                    id="promo-count"
                    type="number"
                    min={1}
                    value={formData.countUser ?? 1}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10) || 1;
                      setFormData({ ...formData, countUser: v });
                      if (formErrors.countUser) setFormErrors((e) => ({ ...e, countUser: '' }));
                    }}
                    className={formErrors.countUser ? 'input-error' : ''}
                  />
                  {formErrors.countUser && (
                    <span className="form-error">{formErrors.countUser}</span>
                  )}
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                onClick={handleCreate}
                className="btn btn-primary"
                disabled={creating}
              >
                {creating ? 'Создание...' : 'Создать'}
              </button>
              <button onClick={closeModal} className="btn btn-secondary" disabled={creating}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
