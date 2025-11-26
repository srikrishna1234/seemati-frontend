import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "https://api.seemati.in/api",
  withCredentials: true, // MOST IMPORTANT 🚀
});

export default axiosInstance;
