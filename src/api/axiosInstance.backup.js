// axiosInstance.backup.js
// -----------------------
import axios from "axios";

let baseURL = "";

if (process.env.REACT_APP_API_URL) {
  baseURL = process.env.REACT_APP_API_URL.replace(/\/$/, "");
} else {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;

    if (host === "localhost" || host === "127.0.0.1") {
      baseURL = "";
    } else if (host === "seemati.in" || host.endsWith("seemati.in")) {
      baseURL = "https://api.seemati.in";
    }
  }
}

const axiosInstance = axios.create({
  baseURL: baseURL || undefined,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error("API error:", err);
    return Promise.reject(err);
  }
);

export default axiosInstance;
