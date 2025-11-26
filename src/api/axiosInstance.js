import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "https://api.seemati.in/api",  // VERY IMPORTANT
  withCredentials: true,                  // Send cookie (seemati_auth)
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 20000,
});

export default axiosInstance;
