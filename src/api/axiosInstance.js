// src/api/axiosInstance.js
import axios from "axios";

/**
 * axiosInstance.js (FINAL FIXED VERSION)
 *
 * ✔ Uses REACT_APP_API_BASE in production (Vercel build)
 * ✔ Falls back to localhost:4000 ONLY in local development
 * ✔ Prevents double /api/api issues
 * ✔ Ensures credentials (cookies) work for admin login
 */

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:4000"
    : "https://seemati-backend.onrender.com"); // <-- your Render backend URL

const axiosInstance = axios.create({
  baseURL: API_BASE, // DO NOT add /api here (your code already uses /api/... endpoints)
  withCredentials: true,
  timeout: 60000,
});

// Optional: helpful console debug
axiosInstance.interceptors.request.use(
  (config) => {
    // console.log(`[API] ${config.method.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // console.warn('[API ERROR]', error?.response?.status, error?.config?.url);
    return Promise.reject(error);
  }
);

export default axiosInstance;
