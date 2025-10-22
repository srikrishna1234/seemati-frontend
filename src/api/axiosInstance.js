// src/api/axiosInstance.js
import axios from "axios";

/**
 * Base URL resolution — prefer a dedicated API base env var, then a generic one,
 * then a sensible public fallback, then localhost for dev.
 */
const rawBase =
  process.env.REACT_APP_API_BASE_URL ||
  process.env.REACT_APP_API_URL ||
  process.env.REACT_APP_API_FALLBACK ||
  process.env.REACT_APP_BACKEND_URL ||
  "https://api.seemati.in";

/**
 * Normalize base: remove any trailing '/api' or trailing slashes so we don't end up with double segments.
 * This allows the server to mount routes at '/' or '/products' while the frontend might still call '/api/products'.
 */
function normalizeBase(b) {
  if (!b) return b;
  // remove trailing slash(es)
  let out = String(b).trim().replace(/\/+$/, "");
  // remove trailing '/api' or '/api/' if present
  out = out.replace(/\/api$/i, "");
  return out;
}

const baseURL = normalizeBase(rawBase);

/**
 * Create axios instance
 */
const instance = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: false,
});

/**
 * Named helpers so UI can set/clear tokens explicitly
 */
export function setAuthToken(token) {
  if (token) {
    instance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    try {
      localStorage.setItem("adminToken", token);
    } catch (e) {
      /* ignore storage errors */
    }
  } else {
    delete instance.defaults.headers.common["Authorization"];
  }
}

export function clearAuthToken() {
  delete instance.defaults.headers.common["Authorization"];
  try {
    localStorage.removeItem("adminToken");
  } catch (e) {
    /* ignore */
  }
}

/**
 * Request interceptor — attach token (localStorage or env) if present
 * Also: transparently rewrite request URLs that start with "/api/" to remove the "/api" prefix.
 * This makes older code calling "/api/products" keep working even when the server mounts routes at "/products".
 */
instance.interceptors.request.use(
  (req) => {
    try {
      // attach token if available
      const localToken =
        typeof localStorage !== "undefined" ? localStorage.getItem("adminToken") : null;
      const availToken = localToken || process.env.REACT_APP_ADMIN_TOKEN || process.env.ADMIN_TOKEN;
      if (availToken) {
        req.headers = req.headers || {};
        req.headers.Authorization = `Bearer ${availToken}`;
      }

      // Normalize request URL: strip leading '/api' if present
      if (req && typeof req.url === "string") {
        // only transform when url starts with '/api/' or equals '/api'
        if (/^\/api(\/|$)/i.test(req.url)) {
          const oldUrl = req.url;
          req.url = req.url.replace(/^\/api/i, "") || "/";
          if (process.env.NODE_ENV !== "production") {
            try {
              console.debug("[axios] rewrite url:", oldUrl, "->", req.url);
            } catch (e) {}
          }
        }
      }

      if (process.env.NODE_ENV !== "production") {
        try {
          console.debug(
            "[axios] req:",
            (req.method || "").toUpperCase(),
            (req.baseURL || "") + (req.url || ""),
            { headers: req.headers }
          );
        } catch (e) {}
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
 * Response interceptors — debug in dev, normalized errors in prod
 */
if (process.env.NODE_ENV !== "production") {
  instance.interceptors.response.use(
    (res) => {
      try {
        console.debug(
          "[axios] res:",
          res.status,
          (res.config && (res.config.baseURL || "") + (res.config.url || "")) || ""
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
          err.response.data?.message || err.response.statusText || `HTTP ${err.response.status}`;
        return Promise.reject(new Error(msg));
      }
      if (err.request) {
        return Promise.reject(new Error("No response from server (network/CORS/timeout)"));
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
          err.response.data?.message || err.response.statusText || `HTTP ${err.response.status}`;
        return Promise.reject(new Error(m));
      }
      if (err.request) return Promise.reject(new Error("No response from server (network)"));
      return Promise.reject(err);
    }
  );
}

export default instance;
