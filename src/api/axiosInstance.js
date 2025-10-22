// src/api/axiosInstance.js
import axios from "axios";

// Use the backend base URL (local or deployed)
const base = process.env.REACT_APP_API_URL || "http://localhost:4000";

// Create axios instance
const instance = axios.create({
  baseURL: base,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

/**
 * 🔐 Auth Interceptor
 * Automatically attaches Bearer token for admin requests.
 *
 * It checks in order:
 * 1. localStorage.getItem("adminToken") — dynamically set after login or stored manually.
 * 2. process.env.REACT_APP_ADMIN_TOKEN — fallback (for local dev if you don't have login yet).
 */
instance.interceptors.request.use(
  (req) => {
    try {
      const localToken = localStorage.getItem("adminToken");
      const envToken = process.env.REACT_APP_ADMIN_TOKEN || process.env.ADMIN_TOKEN;
      const token = localToken || envToken;

      if (token) {
        req.headers = req.headers || {};
        req.headers.Authorization = `Bearer ${token}`;
      }

      // helpful debug info (same as before)
      if (process.env.NODE_ENV !== "production") {
        console.debug(
          "[axios] req:",
          req.method?.toUpperCase(),
          req.baseURL + req.url,
          { headers: req.headers }
        );
      }
    } catch (e) {
      console.error("[axios] request setup error:", e);
    }
    return req;
  },
  (err) => {
    console.error("[axios] request error:", err);
    return Promise.reject(err);
  }
);

/**
 * 🧠 Response Interceptor
 * Keeps your nice debug and normalized error handling.
 */
if (process.env.NODE_ENV !== "production") {
  instance.interceptors.response.use(
    (res) => {
      try {
        console.debug(
          "[axios] res:",
          res.status,
          res.config && (res.config.baseURL + res.config.url)
        );
      } catch (e) {}
      return res;
    },
    (err) => {
      console.error(
        "[axios] response error:",
        err && err.toString(),
        err && err.response && {
          status: err.response.status,
          data: err.response.data,
          headers: err.response.headers,
        },
        err && err.request && { request: err.request }
      );

      if (err.response) {
        const msg =
          err.response.data?.message ||
          err.response.statusText ||
          `HTTP ${err.response.status}`;
        return Promise.reject(new Error(msg));
      }
      if (err.request) {
        return Promise.reject(
          new Error("No response from server (network/CORS/timeout)")
        );
      }
      return Promise.reject(err);
    }
  );
} else {
  instance.interceptors.response.use(
    (r) => r,
    (err) => {
      if (err.response) {
        const m =
          err.response.data?.message ||
          err.response.statusText ||
          `HTTP ${err.response.status}`;
        return Promise.reject(new Error(m));
      }
      if (err.request)
        return Promise.reject(new Error("No response from server (network)"));
      return Promise.reject(err);
    }
  );
}

export default instance;
