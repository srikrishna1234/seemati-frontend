// backend/app.cjs
'use strict';

require('dotenv').config();

// Ensure DB connection attempted before routes are mounted
try {
  require('./utils/db.cjs');
} catch (err) {
  console.error('[App] Could not require ./utils/db.cjs:', err && err.message ? err.message : err);
}

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const path = require('path');

const app = express();

// Basic middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS setup
const rawOrigins = process.env.CORS_ORIGINS || '';
const envOrigins = rawOrigins.split(',').map(s => s.trim()).filter(Boolean);

const defaultOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

const allowedOrigins = Array.from(new Set([...envOrigins, ...defaultOrigins]));
const allowCredentials = String(process.env.CORS_ALLOW_CREDENTIALS || 'false').toLowerCase() === 'true';

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) {
      console.info('[CORS] No origin provided (non-browser or same-origin). Allowing.');
      return callback(null, true);
    }
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.info(`[CORS] Origin allowed: ${origin}`);
      return callback(null, true);
    }
    console.warn(`[CORS] blocked origin: ${origin}`);
    return callback(new Error('CORS policy: origin not allowed'), false);
  },
  credentials: allowCredentials,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// mount routes (keep your current route files)
try {
  const otpRoutes = require('./src/routes/otpRoutes.cjs');
  const productRoutes = require('./src/routes/productRoutes.cjs');

  app.use('/api/otp', otpRoutes);
  console.info('Mounted router: /api/otp -> ./src/routes/otpRoutes.cjs');

  app.use('/api/products', productRoutes);
  console.info('Mounted router: /api/products -> ./src/routes/productRoutes.cjs');
} catch (err) {
  console.error('Error mounting routers:', err && err.message ? err.message : err);
}

// health
app.get('/healthz', (req, res) => res.json({ ok: true }));

// start
const PORT = Number(process.env.PORT || process.env.NODE_PORT || 10000);
app.listen(PORT, () => {
  console.info(`Backend listening on port ${PORT} (NODE_ENV=${process.env.NODE_ENV})`);
});

module.exports = app;
