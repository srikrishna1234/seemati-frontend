// backend/app.cjs
// CommonJS full replacement for running on Render / similar platforms.
// Configured for cookies + CORS + trust proxy

'use strict';

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// If your app is behind a proxy (Render, Vercel, Cloud Run), enable trust proxy
// so secure cookies and client IP detection work correctly.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // trust first proxy
}

// Basic security headers
app.use(helmet());

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsing + cookie parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS: allow credentials and use a whitelist from env
// Set FRONTEND_URLS to the exact origin(s) of your admin frontend (e.g. https://seemati.in,https://admin.seemati.in)
const rawOrigins = process.env.FRONTEND_URLS || process.env.FRONTEND_URL || '';
const allowedOrigins = rawOrigins.split(',').map(s => s.trim()).filter(Boolean);

// Fallback: if allowedOrigins is empty in dev, allow localhost
if (allowedOrigins.length === 0 && process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:3000');
}

const corsOptions = {
  origin: function (origin, callback) {
    // Allow non-browser requests (cURL, server-to-server) where origin is undefined
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      return callback(new Error('CORS: Origin not allowed'), false);
    }
  },
  credentials: true, // <--- IMPORTANT: allow cookies to be sent
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Mount your routers (adjust paths if different)
let authRouter;
let otpRouter;
let productRouter;

try {
  authRouter = require('./src/routes/auth.cjs');
} catch (e) {
  console.error('[app] could not load auth router:', e && e.message ? e.message : e);
}
try {
  otpRouter = require('./src/routes/otpRoutes.cjs');
} catch (e) {
  console.error('[app] could not load otp router:', e && e.message ? e.message : e);
}
try {
  productRouter = require('./src/routes/productRoutes.cjs');
} catch (e) {
  console.error('[app] could not load product router:', e && e.message ? e.message : e);
}

if (authRouter) app.use('/api/auth', authRouter);
if (otpRouter) app.use('/api/otp', otpRouter);
if (productRouter) app.use('/api/products', productRouter);

// Root endpoint (health check) - return 200 so hosting platform health checks pass
app.get('/', function (req, res) {
  res.status(200).json({ ok: true, env: process.env.NODE_ENV || 'development' });
});

// 404 handler
app.use(function (req, res, next) {
  res.status(404).json({ error: 'Not found' });
});

// Basic error handler (improve as needed)
app.use(function (err, req, res, next) {
  console.error('ERROR:', err && err.message ? err.message : err);
  if (err && err.message && err.message.includes('CORS')) {
    return res.status(403).json({ error: 'CORS error: origin not allowed' });
  }
  res.status(err && err.status ? err.status : 500).json({ error: err && err.message ? err.message : 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || process.env.SERVER_PORT || 10000;
app.listen(PORT, function () {
  console.log('[Mongo] Attempting connection to MongoDB...');
  console.log('Backend listening on port ' + PORT + ' (NODE_ENV=' + (process.env.NODE_ENV || 'development') + ')');
});

module.exports = app;
