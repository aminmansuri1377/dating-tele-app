import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1',
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Only trigger logout on 401 if we're not already logging out
    // This prevents interleaving with manual logout
    if (err.response?.status === 401) {
      const store = useAuthStore.getState();
      // If the user is already in the process of logging out (token being cleared),
      // don't trigger another logout via the interceptor
      if (store.accessToken) {
        store.logout();
      }
    }
    return Promise.reject(err);
  },
);
