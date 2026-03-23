import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Token expired – clear store
      localStorage.removeItem('fintrack-store');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
