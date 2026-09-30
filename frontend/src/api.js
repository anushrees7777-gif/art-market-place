import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const api = axios.create({ baseURL: `${API_BASE}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("cb_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const ASSET_BASE = API_BASE;
export default api;
