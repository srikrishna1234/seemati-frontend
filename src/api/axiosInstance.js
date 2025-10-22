import axios from "axios";

const baseURL =
  process.env.REACT_APP_API_URL ||
  process.env.VITE_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "/";

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json"
  }
});

// Attach token from localStorage (common keys)
axiosInstance.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem("authToken") || localStorage.getItem("token");
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // ignore localStorage errors in SSR/test environments
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
);

export default axiosInstance;
