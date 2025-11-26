// frontend/src/api/axiosInstance.js
import axios from "axios";

const axiosInstance = axios.create({
  // include the '/api' prefix so frontend calls like '/products' map to '/api/products'
  baseURL: "https://api.seemati.in/api",
  withCredentials: true,
  timeout: 15000,
});

axiosInstance.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err && err.response) {
      console.error("API error:", err.response.status, err.response.data);
    } else {
      console.error("Network/API error:", err.message || err);
    }
    return Promise.reject(err);
  }
);

export default axiosInstance;
