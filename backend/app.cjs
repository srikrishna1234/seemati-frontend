// backend/app.cjs
'use strict';

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const path = require('path');

// Load env (if using dotenv locally)
if (process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv').config();
  } catch (e) { /* ignore */ }
}

const app = express();

// Basic middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * CORS setup
 * - Set CORS_ORIGINS env var as comma separated list:
 *   e.g. CORS_ORIGINS="http://localhost:3000,https://seemati.in,https://www.seemati.in"
 * - Optionally set CORS_ALLOW_CREDENTIALS=true if your frontend sends cookies/credentials.
 */
const rawOrigins = process.env.CORS_ORIGINS || '';
const envOrigins = rawOrigins
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// sensible default dev origins if none provided
const defaultOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

const allowedOrigins = Array.from(new Set([...envOrigins, ...defaultOrigins]));

const allowCredentials = String(process.env.CORS_ALLOW_CREDENTIALS || 'false').toLowerCase() === 'true';

// CORS options
const corsOptions = {
  origin: function (origin, callback) {
    // origin === undefined means non-browser client (curl, server-to-server). Allow it.
    if (!origin) {
      console.info('[CORS] No origin provided (non-browser or same-origin). Allowing.');
      return callback(null, true);
    }

    // If exact match exists in allowedOrigins -> allow
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.info(`[CORS] Origin allowed: ${origin}`);
      return callback(null, true);
    }

    // Not allowed
    console.warn(`[CORS] Origin rejected: ${origin}`);
    return callback(new Error('CORS policy: origin not allowed'), false);
  },
  credentials: allowCredentials,
  // helpful for older browsers with OPTIONS preflight
  optionsSuccessStatus: 200,
  // you can add allowed headers/methods if you have custom requirements
};

app.use(cors(corsOptions));

// ---- Your routes (keep your existing route mounts) ----
// Example mounts inferred from your render log:
try {
  const otpRoutes = require('./src/routes/otpRoutes.cjs');
  const productRoutes = require('./src/routes/productRoutes.cjs');

  app.use('/api/otp', otpRoutes);
  console.info('Mounted router: /api/otp -> ./src/routes/otpRoutes.cjs');

  app.use('/api/products', productRoutes);
  console.info('Mounted router: /api/products -> ./src/routes/productRoutes.cjs');
} catch (err) {
  console.error('Error mounting routers:', err);
}

// Static/public or other middlewares if any
// app.use(express.static(path.join(__dirname, 'public')));

// Health endpoint
app.get('/healthz', (req, res) => res.json({ ok: true }));

// Listen
const PORT = Number(process.env.PORT || process.env.NODE_PORT || 10000);
app.listen(PORT, () => {
  console.info(`Backend listening on port ${PORT} (NODE_ENV=${process.env.NODE_ENV})`);
});

module.exports = app;
