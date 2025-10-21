// src/api/axiosInstance.js
import axios from "axios";

const base = process.env.REACT_APP_API_URL || "http://localhost:4000";

const instance = axios.create({
  baseURL: base,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Helpful logging for dev: request/response inspectors
if (process.env.NODE_ENV !== "production") {
  instance.interceptors.request.use(
    (req) => {
      try {
        // eslint-disable-next-line no-console
        console.debug("[axios] req:", req.method?.toUpperCase(), req.baseURL + req.url, req);
      } catch (e) {}
      return req;
    },
    (err) => {
      // eslint-disable-next-line no-console
      console.error("[axios] request error:", err);
      return Promise.reject(err);
    }
  );

  instance.interceptors.response.use(
    (res) => {
      try {
        // eslint-disable-next-line no-console
        console.debug("[axios] res:", res.status, res.config && (res.config.baseURL + res.config.url));
      } catch (e) {}
      return res;
    },
    (err) => {
      // eslint-disable-next-line no-console
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
      // produce a friendlier error object for callers
      if (err.response) {
        const msg = err.response.data?.message || err.response.statusText || `HTTP ${err.response.status}`;
        return Promise.reject(new Error(msg));
      }
      if (err.request) {
        // clearly state it's a network/CORS/timeout type failure
        return Promise.reject(new Error("No response from server (network/CORS/timeout)"));
      }
      return Promise.reject(err);
    }
  );
} else {
  // production: minimal interceptor but keep error normalization
  instance.interceptors.response.use((r) => r, (err) => {
    if (err.response) {
      const m = err.response.data?.message || err.response.statusText || `HTTP ${err.response.status}`;
      return Promise.reject(new Error(m));
    }
    if (err.request) return Promise.reject(new Error("No response from server (network)"));
    return Promise.reject(err);
  });
}

export default instance;
