// src/utils/api.js
import axios from "axios";
import jwtDecode from "jwt-decode"; // optional helper for expiry checks — install with: npm i jwt-decode

const api = axios.create({
  baseURL: "http://localhost:4000", // change if your backend URL differs
  withCredentials: true, // keep true if you might use cookies; harmless for localStorage tokens
});

// Attach token from localStorage (if you use httpOnly cookie only, remove this interceptor)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Global response handler: if 401 -> clear auth and redirect to /login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      try {
        // remove local auth (adjust keys if you use different names)
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        // optional: if you use a React router history, you can navigate programmatically.
        // For simplicity and reliability across setups, do a hard redirect:
        const current = window.location.pathname + window.location.search;
        // If user is already on /login, don't loop
        if (!current.startsWith("/login")) {
          // preserve returnTo so user can be redirected back after login (optional)
          window.location.href = `/login?returnTo=${encodeURIComponent(current)}`;
        } else {
          // if already on login, just reload to clear possible cached state
          window.location.reload();
        }
      } catch (e) {
        // fallback redirect
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
