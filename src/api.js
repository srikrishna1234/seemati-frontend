// frontend/src/api.js
import axios from "axios";

// Backend base URL (falls back to localhost:4000 if .env not set)
const API_HOST = process.env.REACT_APP_API_URL || "http://localhost:4000";

// ✅ Because all your routes are under /api in backend/app.js
const baseURL = API_HOST.replace(/\/$/, "") + "/api";

const api = axios.create({
  baseURL,
  timeout: 10000, // 10s timeout
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

export default api;

