// backend/app.cjs
'use strict';

const path = require('path');
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');

const app = express();

app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

/**
 * CORS configuration
 * - Allowed origins: list the frontend origins you serve from
 * - credentials: true -> Access-Control-Allow-Credentials header will be set
 * - dynamic origin handling so preflight is accepted correctly
 */
const allowedOrigins = [
  'https://seemati.in',
  'https://www.seemati.in',
  'https://api.seemati.in', // if front-end needs to call same-origin from different host
  // Add any preview/dev origin you use, for example Vercel preview URLs:
  'https://seemati-frontend-luj7-n8sfvhd1d-b-ravi-shankars-projects.vercel.app'
];

app.use((req, res, next) => {
  // Debug logging for CORS (only in dev or when DEBUG_CORS env var is set)
  if (process.env.DEBUG_CORS) {
    console.log('[CORS DEBUG] incoming raw:', req.get('origin'));
  }
  next();
});

app.use(cors({
  origin: function(origin, callback) {
    // allow non-browser requests such as curl (origin === undefined)
    if (!origin) return callback(null, true);
    // accept if origin is in our whitelist
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    // otherwise reject
    return callback(new Error('CORS policy: origin not allowed'), false);
  },
  credentials: true,           // Access-Control-Allow-Credentials: true
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With','Accept']
}));

// === Route mounting ===
try {
  const otpRouter = require('./src/routes/otpRoutes.cjs');
  app.use('/api/otp', otpRouter);
  console.log('Mounted router: /api/otp -> ./src/routes/otpRoutes.cjs');
} catch (err) {
  console.error('Failed to mount OTP router:', err && err.stack ? err.stack : err);
}

// other routers (if you have productRoutes etc.)
try {
  const productRoutes = require('./src/routes/productRoutes.cjs');
  app.use('/api/products', productRoutes);
  console.log('Mounted router: /api/products -> ./src/routes/productRoutes.cjs');
} catch (err) {
  // ignore if not present
}

// static folders
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// health
app.get('/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

// Catch 404 for unknown API endpoints
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.status(404).send('Not Found');
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err && err.stack ? err.stack : err);
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  if (req.path.startsWith('/api')) {
    return res.status(status).json({ error: message });
  }
  res.status(status).send(message);
});

const PORT = process.env.PORT || 4000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend listening on port ${PORT} (NODE_ENV=${process.env.NODE_ENV || 'dev'})`);
  });
}

module.exports = app;
