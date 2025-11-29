// src/api/axiosInstance.js
import axios from "axios";

// --------------------------------------------------
// Determine the correct API base URL
// --------------------------------------------------
function getBaseURL() {
  // If environment override exists — use it
  if (process.env.REACT_APP_API_BASE) {
    return process.env.REACT_APP_API_BASE.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    const host = window.location.hostname;

    // Local development → use relative "/api"
    if (host === "localhost" || host === "127.0.0.1") {
      return "/api"; // CRA dev server proxies this to backend
    }

    // Production → ALWAYS call public API with /api prefix
    if (host === "seemati.in" || host.endsWith("seemati.in")) {
      return "https://api.seemati.in/api";
    }
  }

  // Default fallback
  return "/api";
}

const axiosInstance = axios.create({
  baseURL: getBaseURL(),              // ⭐ Ensures /api is always included
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// --------------------------------------------------
// Optional: simple error logger (unchanged behavior)
// --------------------------------------------------
axiosInstance.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error("API error:", err?.response || err);
    return Promise.reject(err);
  }
);

export default axiosInstance;
