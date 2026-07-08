import axios from 'axios';

function attachInterceptors(instance, baseUrl) {
  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const original = error.config;
      const isRefreshCall = original.url?.includes('/refresh');
      if (error.response?.status === 401 && !original._retry && !isRefreshCall) {
        original._retry = true;
        try {
          const { data } = await axios.post('/auth/refresh', {}, { withCredentials: true });
          localStorage.setItem('accessToken', data.accessToken);
          original.headers['Authorization'] = `Bearer ${data.accessToken}`;
          return instance(original);
        } catch {
          localStorage.removeItem('accessToken');
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
  );
}

// cliente para /auth (login, refresh, etc.)
const api = axios.create({ baseURL: '/auth', withCredentials: true });
attachInterceptors(api, '/auth');
export default api;

// cliente para /api (rotas autenticadas gerais)
export const http = axios.create({ baseURL: '/api', withCredentials: true });
attachInterceptors(http, '/api');

// cliente para /admin (rotas de platform_admin)
export const adminApi = axios.create({ baseURL: '/admin', withCredentials: true });
attachInterceptors(adminApi, '/admin');
