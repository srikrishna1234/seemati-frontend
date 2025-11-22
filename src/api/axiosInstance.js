import axios from "axios";

/*
  axiosInstance.js
  - Uses environment variables when available (REACT_APP_API_URL, VITE_API_URL, NEXT_PUBLIC_API_URL)
  - If running on localhost and no env var provided, defaults to http://localhost:4000/
  - Default production baseURL is https://api.seemati.in/
  - Sends JSON, includes credentials, and attaches Authorization bearer token from localStorage (common keys).
  - Exports default axios instance.
*/

function defaultBaseUrl() {
  const env =
    process.env.REACT_APP_API_URL ||
    process.env.VITE_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "";

  if (env && env.length) {
    // ensure trailing slash
    return env.replace(/\/+$/, "") + "/";
  }

  // If running in a browser on localhost, prefer local backend
  try {
    if (typeof window !== "undefined" && window.location && window.location.hostname) {
      const host = window.location.hostname;
      if (host === "localhost" || host === "127.0.0.1") {
        return "http://localhost:4000/";
      }
    }
  } catch (e) {
    // ignore
  }

  // production default
  return "https://api.seemati.in/";
}

const baseURL = defaultBaseUrl();

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: attach token if present
axiosInstance.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem("authToken") || localStorage.getItem("token");
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // ignore localStorage issues (SSR / restricted env)
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response passthrough (you can add error handling/logging here)
axiosInstance.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
);

export default axiosInstance;
