// src/api/axiosInstance.js
import axios from "axios";

/**
 * Base URL resolution — prefer a dedicated API base env var, then fallback.
 * We intentionally keep base without forcing '/api' so frontend and backend can call
 * either /products or /api/... depending on how routes are mounted.
 */
const rawBase =
  process.env.REACT_APP_API_BASE_URL ||
  process.env.REACT_APP_API_URL ||
  process.env.REACT_APP_API_FALLBACK ||
  process.env.REACT_APP_BACKEND_URL ||
  "https://api.seemati.in";

/** Normalize base (no trailing slash) */
function normalizeBase(b) {
  if (!b) return b;
  return String(b).trim().replace(/\/+$/, "");
}

const baseURL = normalizeBase(rawBase);

const instance = axios.create({
  baseURL,
  timeout: 15000,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  withCredentials: false,
});

/* Token helpers */
export function setAuthToken(token) {
  if (token) {
    instance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    try { localStorage.setItem("adminToken", token); } catch (e) {}
  } else {
    delete instance.defaults.headers.common["Authorization"];
  }
}
export function clearAuthToken() {
  delete instance.defaults.headers.common["Authorization"];
  try { localStorage.removeItem("adminToken"); } catch (e) {}
}

/* Request interceptor: attach token if available. Do NOT rewrite '/api' */
instance.interceptors.request.use(
  (req) => {
    try {
      const localToken = typeof localStorage !== "undefined" ? localStorage.getItem("adminToken") : null;
      const availToken = localToken || process.env.REACT_APP_ADMIN_TOKEN || process.env.ADMIN_TOKEN;
      if (availToken) { req.headers = req.headers || {}; req.headers.Authorization = `Bearer ${availToken}`; }

      if (process.env.NODE_ENV !== "production") {
        try { console.debug("[axios] req:", (req.method || "").toUpperCase(), (req.baseURL || "") + (req.url || ""), { headers: req.headers }); } catch (e) {}
      }
    } catch (e) { console.error("[axios] request setup error:", e); }
    return req;
  },
  (err) => { console.error("[axios] request error:", err); return Promise.reject(err); }
);

/* Response interceptors */
if (process.env.NODE_ENV !== "production") {
  instance.interceptors.response.use(
    (res) => { try { console.debug("[axios] res:", res.status, (res.config && (res.config.baseURL || "") + (res.config.url || "")) || ""); } catch (e) {} return res; },
    (err) => {
      console.error("[axios] response error:", err && err.toString(), err && err.response && { status: err.response.status, data: err.response.data }, err && err.request && { request: err.request });
      if (err.response) {
        const msg = err.response.data?.message || err.response.statusText || `HTTP ${err.response.status}`;
        return Promise.reject(new Error(msg));
      }
      if (err.request) return Promise.reject(new Error("No response from server (network/CORS/timeout)"));
      return Promise.reject(err);
    }
  );
} else {
  instance.interceptors.response.use((r) => r, (err) => {
    if (err.response) { const m = err.response.data?.message || err.response.statusText || `HTTP ${err.response.status}`; return Promise.reject(new Error(m)); }
    if (err.request) return Promise.reject(new Error("No response from server (network)"));
    return Promise.reject(err);
  });
}

export default instance;
