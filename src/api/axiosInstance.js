// src/api/axiosInstance.js
import axios from "axios";

// Use the backend base URL (REACT_APP_API_URL should be set in Vercel/Azure/etc.)
// Fallback to local dev or the known deployed backend.
const base =
  process.env.REACT_APP_API_URL || "https://seemati-backend.onrender.com" || "http://localhost:4000";

// Create axios instance
const instance = axios.create({
  baseURL: base,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
  // IMPORTANT: token-based Authorization does NOT require cookies/credentials.
  // Setting withCredentials: true will make the browser send cookies and require
  // the server to echo the exact origin (not "*"), which caused your CORS issue.
  withCredentials: false,
});

/**
 * 🔐 Auth Interceptor
 * Automatically attaches Bearer token for admin requests.
 *
 * NOTE: Avoid placing real secrets into client-side environment variables in production.
 * If process.env.ADMIN_TOKEN is present it will be bundled into your frontend build —
 * only use that value for local development.
 */
instance.interceptors.request.use(
  (req) => {
    try {
      const localToken = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
      const envToken =
        (process.env.REACT_APP_ADMIN_TOKEN || process.env.ADMIN_TOKEN) || null;

      const token = localToken || envToken;

      if (token) {
        req.headers = req.headers || {};
        req.headers.Authorization = `Bearer ${token}`;
      }

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
      if (err.request) return Promise.reject(new Error("No response from server (network)"));
      return Promise.reject(err);
    }
  );
}

export default instance;
