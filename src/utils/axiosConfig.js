// src/utils/axiosConfig.js
import axios from "axios";

// base URL for backend
axios.defaults.baseURL = "http://localhost:4000";
axios.defaults.headers.common["Accept"] = "application/json";

// Apply token dynamically for every request
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Optional: handle unauthorized globally
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("⚠️ Unauthorized, redirecting to login...");
      // Optional auto redirect:
      // window.location.href = "/admin/login";
    }
    return Promise.reject(error);
  }
);

export default axios;
