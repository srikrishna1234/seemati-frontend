// src/api/axiosInstance.js
import axios from 'axios';

/**
 * axiosInstance
 *
 * - Uses REACT_APP_API_BASE if defined (e.g. set to http://localhost:4000 for local testing).
 * - Otherwise defaults to http://localhost:4000 (local dev) — this lets you test your local backend.
 * - Keeps withCredentials true so cookies/auth work same as production.
 *
 * Important:
 * - Your frontend code currently calls endpoints like "/api/products" (i.e. includes "/api").
 *   So this instance intentionally sets the base URL to the host root (no trailing "/api")
 *   to avoid creating double "/api/api/..." URLs.
 *
 * Usage:
 *  - For local testing you can set REACT_APP_API_BASE=http://localhost:4000 in your frontend .env
 *  - When you want to use production API, set REACT_APP_API_BASE=https://api.seemati.in
 */

const BASE = process.env.REACT_APP_API_BASE || 'http://localhost:4000';

const axiosInstance = axios.create({
  baseURL: BASE,
  withCredentials: true,
  timeout: 60000
});

// Basic request/response logger useful while debugging (optional)
axiosInstance.interceptors.request.use(cfg => {
  // uncomment for verbose local debugging:
  // console.debug('[API request]', cfg.method.toUpperCase(), cfg.url);
  return cfg;
}, err => Promise.reject(err));

axiosInstance.interceptors.response.use(resp => resp, err => {
  // normalize errors
  if (err && err.response) {
    // you can log or transform here
    // console.error('[API error]', err.response.status, err.response.config && err.response.config.url);
  }
  return Promise.reject(err);
});

export default axiosInstance;
