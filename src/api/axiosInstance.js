// src/api/axiosInstance.js
import axios from "axios";

/**
 * SINGLE SOURCE OF TRUTH
 * - Local: http://localhost:4000
 * - Live:  https://api.seemati.in
 */

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:4000"
    : "https://api.seemati.in");

const axiosInstance = axios.create({
  baseURL: API_BASE, // DO NOT append /api here
  withCredentials: true,
  timeout: 60000,
});

export default axiosInstance;
