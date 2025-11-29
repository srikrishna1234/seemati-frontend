// src/api/axiosInstance.js
import axios from "axios";

/**
 * Robust axios instance that:
 * - uses REACT_APP_API_BASE if provided
 * - on production (seemati.in) uses https://api.seemati.in as base but will auto-prefix /api
 *   for relative paths that omit it (so '/products' -> '/api/products' on production)
 * - on localhost uses relative '/api' so CRA dev proxy works
 * - preserves withCredentials and timeout
 */

function getRuntimeBase() {
  // env override (explicit)
  if (process.env.REACT_APP_API_BASE) {
    return process.env.REACT_APP_API_BASE.replace(/\/$/, "");
  }

  // in browser
  if (typeof window !== "undefined") {
    const host = window.location.hostname;

    // dev local
    if (host === "localhost" || host === "127.0.0.1") {
      // keep base blank (use relative paths like '/api/...')
      return "";
    }

    // production public site - keep root host so admin code that expects it continues to work
    if (host === "seemati.in" || host.endsWith("seemati.in")) {
      return "https://api.seemati.in";
    }
  }

  // fallback to empty (relative)
  return "";
}

const baseURL = getRuntimeBase();

const axiosInstance = axios.create({
  baseURL: baseURL || undefined, // undefined means use relative URLs as-is
  withCredentials: true,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Request interceptor: normalize relative request paths on production
axiosInstance.interceptors.request.use(
  (config) => {
    try {
      // if config.url is absolute (starts with http) — leave it alone
      const url = config.url || "";

      if (typeof url === "string" && url.match(/^https?:\/\//i)) {
        return config;
      }

      // If we are on production host (baseURL points to api.seemati.in) and the path is relative,
      // ensure it has the /api prefix. This fixes calls that used '/products' instead of '/api/products'.
      const runningOnPublic = !!baseURL && baseURL.includes("api.seemati.in");

      if (runningOnPublic && typeof url === "string" && url.startsWith("/")) {
        // if url already starts with /api, leave it
        if (!url.startsWith("/api/") && url !== "/api") {
          // prefix /api
          config.url = `/api${url}`;
        }
      }

      // If baseURL is empty (dev) and caller passed '/api/..' that's fine.
    } catch (e) {
      // don't block the request on interceptor errors
      // eslint-disable-next-line no-console
      console.warn("axiosInstance request interceptor error:", e);
    }
    return config;
  },
  (err) => Promise.reject(err)
);

// Simple response logger for debugging
axiosInstance.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err && err.response) {
      // eslint-disable-next-line no-console
      console.error("API error:", err.response.status, err.response.data);
    } else {
      // eslint-disable-next-line no-console
      console.error("Network/API error:", err.message || err);
    }
    return Promise.reject(err);
  }
);

export default axiosInstance;
