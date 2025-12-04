// src/api/axiosInstance.js
import axios from "axios";

/**
 * Clean & reliable axios setup:
 * - Uses REACT_APP_API_URL for production (Render backend)
 * - Falls back to localhost:4000 during development
 * - No domain detection, no auto-prefixing
 * - You control all API paths clearly
 */

const API_BASE =
  process.env.REACT_APP_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:4000"
    : "");

const axiosInstance = axios.create({
  baseURL: API_BASE, // e.g. https://seemati-backend.onrender.com
  withCredentials: true,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Debug logging
axiosInstance.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response) {
      console.error(
        "API error:",
        err.response.status,
        err.response.data || err.response.statusText
      );
    } else {
      console.error("Network error:", err.message);
    }
    return Promise.reject(err);
  }
);

export default axiosInstance;
