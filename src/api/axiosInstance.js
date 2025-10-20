// src/api/axiosInstance.js
import axios from "axios";

// CRA only exposes vars starting with REACT_APP_
const baseURL = process.env.REACT_APP_API_BASE_URL || "http://localhost:4000";

const axiosInstance = axios.create({
  baseURL,
  timeout: 15000, // 15s timeout
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Normalize responses and errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const msg =
        error.response.data?.message ||
        error.response.statusText ||
        `HTTP ${error.response.status}`;
      return Promise.reject(new Error(msg));
    } else if (error.request) {
      return Promise.reject(new Error("No response from server"));
    } else {
      return Promise.reject(new Error(error.message));
    }
  }
);

export default axiosInstance;
