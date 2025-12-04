// src/api/axiosInstance.js
import axios from "axios";

/**
 * axiosInstance - final stable version
 * Prevents double /api/api/... issues and cleanly supports:
 *  - Local development (CRA proxy)  -> baseURL = "/api"
 *  - Production with REACT_APP_API_URL
 */

const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

let API_BASE = "";

// ---------------------------------------------
// 🔥 DEV ENVIRONMENT (localhost)
// ---------------------------------------------
if (isLocalhost) {
  // CRA dev server proxy handles /api → http://localhost:4000/api
  API_BASE = "/api";
}
// ---------------------------------------------
// 🔥 PRODUCTION ENVIRONMENT
// ---------------------------------------------
else if (process.env.REACT_APP_API_URL) {
  // Use explicit env var (e.g. "https://api.seemati.in/api")
  API_BASE = process.env.REACT_APP_API_URL.replace(/\/+$/, ""); // trim trailing slash
}
// ---------------------------------------------
// 🔥 FALLBACK (same-origin /api)
// ---------------------------------------------
else {
  API_BASE = "/api";
}

console.debug("[axiosInstance] baseURL =", API_BASE);

const axiosInstance = axios.create({
  baseURL: API_BASE,       // ⬅ ensures no double /api/api
  withCredentials: true,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ---------------------------------------------
// RESPONSE INTERCEPTOR - Better Error Tracking
// ---------------------------------------------
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error(
        "[API] SERVER ERROR:",
        error.response.status,
        error.response.data || error.response.statusText
      );
    } else if (error.request) {
      console.error("[API] NO RESPONSE (network/CORS):", error.message);
    } else {
      console.error("[API] REQUEST SETUP ERROR:", error.message);
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
