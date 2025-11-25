// src/api/axiosInstance.js
import axios from 'axios';

// Use REACT_APP_API_URL if provided, otherwise default to the API base including /api
// This keeps existing call sites working (they often do api.post('/otp/send') or api.get('/auth/me'))
const baseURL = process.env.REACT_APP_API_URL || 'https://api.seemati.in/api';

const axiosInstance = axios.create({
  baseURL,
  timeout: 30000,
  withCredentials: true, // keeps cookie-based auth working
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

export default axiosInstance;
