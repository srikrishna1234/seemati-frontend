// backend/app.cjs
'use strict';

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const app = express();

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Read FRONTEND_URLS env and be tolerant of common paste mistakes
let rawOrigins = process.env.FRONTEND_URLS || process.env.FRONTEND_URL || '';
// If someone accidentally pasted "FRONTEND_URLS=..." as the value, strip it
if (rawOrigins.trim().toUpperCase().startsWith('FRONTEND_URLS=')) {
  rawOrigins = rawOrigins.trim().substring('FRONTEND_URLS='.length);
}

// Split by comma or newline, trim and filter empty
const allowedOrigins = rawOrigins
  .split(/[,\\n]/)
  .map((s) => (s || '').trim())
  .filter(Boolean);

// Always include the production hosts if not present
['https://seemati.in', 'https://www.seemati.in'].forEach((h) => {
  if (!allowedOrigins.includes(h)) allowedOrigins.push(h);
});

// Log what we will allow
console.log('[CORS] FRONTEND_URLS raw:', rawOrigins);
console.log('[CORS] allowedOrigins:', allowedOrigins);

/**
 * CORS options:
 * - Allow no-origin (curl / server-to-server)
 * - Allow exact matches from allowedOrigins
 * - Allow any vercel preview subdomain (*.vercel.app) automatically
 * - Allow localhost in non-production for dev
 */
const corsOptions = {
  origin: function (origin, callback) {
    // Allow server-to-server or same-origin (no origin header)
    if (!origin) return callback(null, true);

    // Exact match with configured origins
    if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);

    // Allow localhost in non-production
    if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost')) {
      return callback(null, true);
    }

    // Wildcard: allow any vercel preview deploy (hostname endsWith .vercel.app)
    try {
      const u = new URL(origin);
      if (u.hostname && u.hostname.endsWith('.vercel.app')) {
        console.warn('[CORS] Allowing vercel preview origin:', origin);
        return callback(null, true);
      }
    } catch (err) {
      // ignore parsing errors and fall through to reject
    }

    // Not allowed
    console.error('ERROR: CORS: Origin not allowed ->', origin);
    return callback(new Error('CORS: Origin not allowed'), false);
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Basic health check
app.get('/', (req, res) => res.status(200).json({ ok: true, env: process.env.NODE_ENV || 'development' }));

// Errors handler
app.use((err, req, res, next) => {
  console.error('ERROR:', err && err.message ? err.message : err);
  if (err && err.message && err.message.includes('CORS')) {
    return res.status(403).json({ error: 'CORS error: origin not allowed' });
  }
  res.status(err && err.status ? err.status : 500).json({ error: err && err.message ? err.message : 'Internal server error' });
});

// ---------- MongoDB connect + mount and start ----------
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MONGO_URI is not set. Set it in Render environment variables.');
  process.exit(1);
}

const connectWithRetry = async (retries = 6, delayMs = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`[Mongo] Attempting connection to MongoDB (try ${i + 1}/${retries})...`);
      await mongoose.connect(MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      });
      console.log('[Mongo] Connected to MongoDB successfully.');
      return;
    } catch (err) {
      console.error('[Mongo] Connection error:', err && err.message ? err.message : err);
      if (i < retries - 1) {
        console.log(`[Mongo] Retry in ${delayMs}ms...`);
        await new Promise((r) => setTimeout(r, delayMs));
      } else {
        throw err;
      }
    }
  }
};

const startServer = async () => {
  try {
    await connectWithRetry();

    // Mount routers after DB connect
    try {
      const authRouter = require('./src/routes/auth.cjs');
      const otpRouter = require('./src/routes/otpRoutes.cjs');
      const productRouter = require('./src/routes/productRoutes.cjs');

      if (authRouter) app.use('/api/auth', authRouter);
      if (otpRouter) app.use('/api/otp', otpRouter);
      if (productRouter) app.use('/api/products', productRouter);
    } catch (e) {
      console.error('[app] Router load error:', e && e.message ? e.message : e);
    }

    const PORT = process.env.PORT || process.env.SERVER_PORT || 10000;
    app.listen(PORT, () => {
      console.log(`Backend listening on port ${PORT} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
    });
  } catch (err) {
    console.error('[Startup] Failed to connect to MongoDB after retries. Exiting. Error:', err && err.message ? err.message : err);
    process.exit(1);
  }
};

startServer();

module.exports = app;
