import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const client = axios.create({
  baseURL: `${API_URL}/api`,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('airguard_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;
export { API_URL };

