// src/api/axiosInstance.js
import axios from 'axios';

// Keep this pointing to your site root (no duplicate /api).
// Use REACT_APP_API_URL if set (Vercel env). Default to site root.
const baseURL = process.env.REACT_APP_API_URL || 'https://api.seemati.in';

const axiosInstance = axios.create({
  baseURL,
  timeout: 30000,
  withCredentials: true, // keep cookie-based auth working
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

export default axiosInstance;
