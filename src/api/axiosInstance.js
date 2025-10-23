// src/api/axiosInstance.js
import axios from "axios";

/**
 * Base URL resolution — prefer a dedicated API base env var, then a generic one,
 * then the deployed backend fallback, then localhost for dev.
 */
const baseURL =
  process.env.REACT_APP_API_BASE_URL ||
  process.env.REACT_APP_API_URL ||
  "https://seemati-backend.onrender.com";

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
  // We are not using cookies for token auth — keep this false.
  withCredentials: false,
});

/**
 * Helper to set / clear Authorization header on the instance.
 * Use setAuthToken(token) after login; use clearAuthToken() on logout.
 */
export function setAuthToken(token) {
  if (token) {
    instance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete instance.defaults.headers.common["Authorization"];
  }
}

export function clearAuthToken() {
  delete instance.defaults.headers.common["Authorization"];
}

/**
 * Request interceptor:
 * - No automatic Authorization injection here (we removed automatic lookup).
 * - It only ensures headers object exists and optionally logs requests in dev.
 */
instance.interceptors.request.use(
  (req) => {
    req.headers = req.headers || {};
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
    return req;
  },
  (err) => {
    console.error("[axios] request error:", err);
    return Promise.reject(err);
  }
);

/**
 * Response interceptors — keep helpful debug logging and normalized errors.
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
