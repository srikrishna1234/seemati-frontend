// frontend/src/api/axiosInstance.js
import axios from "axios";

const axiosInstance = axios.create({
  // Use the API host WITHOUT the trailing '/api'
  baseURL: "https://api.seemati.in",
  withCredentials: true, // send cookies
  timeout: 15000, // 15s timeout
});

// Optional: add a response interceptor to log/fail gracefully
axiosInstance.interceptors.response.use(
  (res) => res,
  (err) => {
    // helpful for debugging network / CORS issues on the client
    if (err && err.response) {
      // server responded with non-2xx
      console.error("API error:", err.response.status, err.response.data);
    } else {
      // network error or no response
      console.error("Network/API error:", err.message || err);
    }
    return Promise.reject(err);
  }
);

export default axiosInstance;
