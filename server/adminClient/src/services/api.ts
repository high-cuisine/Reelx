import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api/admin-c7ad44cbad762a5da0a4/admin';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor для добавления sessionId к запросам
api.interceptors.request.use((config) => {
  const sessionId = localStorage.getItem('adminSessionId');
  if (sessionId) {
    config.headers['x-session-id'] = sessionId;
  }
  return config;
});

// Interceptor для обработки ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminSessionId');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

export default api;
