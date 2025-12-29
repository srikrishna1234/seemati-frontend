// src/api/axiosInstance.js
import axios from "axios";

const axiosInstance = axios.create({
  baseURL:
    process.env.REACT_APP_API_BASE
      ? `${process.env.REACT_APP_API_BASE}/api`
      : "/api",
  withCredentials: true, // 🔴 REQUIRED FOR ADMIN AUTH COOKIE
});

// Optional: simple dev logging (safe)
axiosInstance.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response) {
      console.error(
        "[API ERROR]",
        err.response.status,
        err.response.data
      );
    } else {
      console.error("[API ERROR]", err.message);
    }
    return Promise.reject(err);
  }
);

export default axiosInstance;
