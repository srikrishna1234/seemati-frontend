import axios from "axios";

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  "http://localhost:4000/api";

const axiosInstance = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export default axiosInstance;
