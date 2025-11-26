// src/api/axiosInstance.js
import axios from 'axios';

// IMPORTANT: baseURL should point to the API root (no duplicated /api).
// The frontend code calls endpoints like "/api/otp/send" etc.
// So use https://api.seemati.in (not .../api)
const baseURL = process.env.REACT_APP_API_URL || 'https://api.seemati.in';

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true, // send cookies
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  },
  timeout: 20000
});

export default axiosInstance;
