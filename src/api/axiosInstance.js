// src/api/axiosInstance.js
import axios from 'axios';

const base = process.env.REACT_APP_API_URL || 'http://localhost:4000';

const instance = axios.create({
  baseURL: base,           // call backend directly (no extra 3000 proxy hop)
  timeout: 10000,          // 10s timeout to avoid long hanging requests
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

instance.interceptors.response.use(
  (res) => res,
  (err) => {
    // normalize axios error to helpful message
    if (err.response) {
      const msg = err.response.data?.message || err.response.statusText || `HTTP ${err.response.status}`;
      return Promise.reject(new Error(msg));
    }
    if (err.request) return Promise.reject(new Error('No response from server'));
    return Promise.reject(err);
  }
);

export default instance;
