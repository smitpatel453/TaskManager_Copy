import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
// Remove trailing slash to prevent double slashes
const normalizedBase = API_BASE.replace(/\/$/, '');
const API_URL = normalizedBase.endsWith('/api') ? normalizedBase : `${normalizedBase}/api`;

export const api = axios.create({
  baseURL: API_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const isBrowser = typeof window !== "undefined" && typeof localStorage !== "undefined";
  const token = isBrowser ? localStorage.getItem("token") : null;

  if (token) {
    // Ensure token is a string, not an object
    const tokenStr = typeof token === 'string' ? token : String(token);
    if (tokenStr && tokenStr !== 'null' && tokenStr !== 'undefined' && !tokenStr.includes('[object')) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${tokenStr}`;
    } else {
      console.warn('Invalid token format detected:', { type: typeof token, value: token });
    }
  }
  return config;
});

