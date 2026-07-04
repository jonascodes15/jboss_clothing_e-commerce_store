import axios from 'axios';
const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use((c) => {
  const t = localStorage.getItem('jbc_token');
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});
api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) {
    localStorage.removeItem('jbc_token');
    localStorage.removeItem('jbc_user');
    window.location.href = '/login';
  }
  return Promise.reject(err);
});
export default api;
