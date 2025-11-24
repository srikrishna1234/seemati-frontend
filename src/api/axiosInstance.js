// src/api/axiosInstance.js
import axios from 'axios';

const baseURL = process.env.REACT_APP_API_URL || 'https://api.seemati.in/api';

const axiosInstance = axios.create({
  baseURL,
  timeout: 30000,
  withCredentials: true, // keeps cookie-based auth working (you logged in with OTP)
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

export default axiosInstance;
