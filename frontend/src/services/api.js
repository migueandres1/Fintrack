import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

// Siempre adjunta el token antes de cada request.
// Esto cubre el caso en que initAuth() todavía no corrió (ej: redirect de Stripe).
api.interceptors.request.use((config) => {
  if (!config.headers.Authorization) {
    try {
      const stored = JSON.parse(localStorage.getItem('fintrack-store') || '{}');
      const token  = stored?.state?.token;
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch {}
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Token expirado – limpiar store y redirigir solo si no estamos ya en /login
      if (!window.location.pathname.startsWith('/login')) {
        localStorage.removeItem('fintrack-store');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
