// src/api/axiosInstance.js
import axios from "axios";

/**
 * axiosInstance.js
 *
 * Behavior:
 *  - If REACT_APP_API_URL is set (recommended for Render deployment), use it exactly.
 *  - Otherwise, infer a sensible default for local dev:
 *      - If running in browser, use the same origin but port 4000 (common local backend).
 *      - Fallback to http://localhost:4000
 *
 * Notes:
 *  - Set REACT_APP_API_URL=https://<your-backend-url> (no trailing slash) in your .env for production.
 */

const envUrl = process.env.REACT_APP_API_URL;

function inferLocalBaseUrl() {
  if (typeof window === "undefined") {
    return "http://localhost:4000";
  }

  const origin = window.location.origin;
  try {
    const url = new URL(origin);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      url.port = "4000";
      return url.toString().replace(/\/$/, "");
    }
  } catch (e) {
    // ignore
  }
  return origin || "http://localhost:4000";
}

const baseURL = envUrl || inferLocalBaseUrl();

const axiosInstance = axios.create({
  baseURL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

export default axiosInstance;
