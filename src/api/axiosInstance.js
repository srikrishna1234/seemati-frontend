// src/api/axiosInstance.js
import axios from 'axios';

const baseURL = process.env.REACT_APP_API_URL || 'https://api.seemati.in';

// increase timeout to handle slow cold-starts (60s)
const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60 seconds
});

// Optional verbose logs in development to help debug requests
if (process.env.NODE_ENV === 'development') {
  axiosInstance.interceptors.request.use(req => {
    // eslint-disable-next-line no-console
    console.log('[axios] req:', req.method?.toUpperCase(), req.baseURL + req.url);
    return req;
  });
  axiosInstance.interceptors.response.use(
    res => res,
    err => {
      // eslint-disable-next-line no-console
      console.error('[axios] resp error:', err?.config?.url, err?.message, err?.response?.status);
      return Promise.reject(err);
    }
  );
}

export default axiosInstance;
