import axios from "axios";

/*
  axiosInstance.js
  - Uses environment variables when available (REACT_APP_API_URL, VITE_API_URL, NEXT_PUBLIC_API_URL)
  - Default baseURL is https://api.seemati.in to match backend mount (public API at /products)
  - Sends JSON, includes credentials, and attaches Authorization bearer token from localStorage (common keys).
  - Exports default axios instance.
*/

const baseURL =
  process.env.REACT_APP_API_URL ||
  process.env.VITE_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://api.seemati.in/';

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: attach token if present
axiosInstance.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem("authToken") || localStorage.getItem("token");
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // ignore localStorage issues (SSR / restricted env)
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response passthrough (you can add error handling/logging here)
axiosInstance.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
);

export default axiosInstance;
