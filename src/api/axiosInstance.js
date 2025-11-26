// src/api/axiosInstance.js
// Full replacement — sets baseURL and sends cookies with each request
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://api.seemati.in/api";

// create instance
const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  withCredentials: true, // IMPORTANT: include cookies
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// Optional: simple response interceptor for debug-friendly errors
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // attach response data to error for easier debugging
    if (err && err.response && err.response.data) {
      err.message = err.response.data.message || JSON.stringify(err.response.data) || err.message;
    }
    return Promise.reject(err);
  }
);

export default api;
