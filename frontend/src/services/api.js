import axios from 'axios';

// En builds móviles (--mode mobile) se usa la URL absoluta del servidor.
// En builds web se usa la ruta relativa /api (Nginx la proxea al backend).
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
});

// Permite que App.jsx registre la función navigate de React Router.
// El interceptor 401 la usará para redirigir sin romper el WebView nativo.
export let navigateFn = null;
export function setNavigate(fn) { navigateFn = fn; }

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
        if (navigateFn) {
          navigateFn('/login', { replace: true });
        } else {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(err);
  }
);

export default api;
