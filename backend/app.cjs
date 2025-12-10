// backend/app.cjs
'use strict';

/**
 * Robust backend/app.cjs
 * - Reads ALLOWED_ORIGINS or CORS_ORIGINS env (comma separated)
 * - Builds origin matcher (strings + regex if a value is /.../ form)
 * - Properly handles CORS preflight and sets Access-Control-Allow-* headers
 * - Mounts OTP routes at multiple endpoints for compatibility
 * - Mounts product/admin routes if present
 *
 * Replace this file and restart your backend process.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// --- Helper: build allowed origin matchers from env ---
const raw = (process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGINS || '').trim();
// default allowed origins (include localhost for dev)
let allowedOrigins = raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : [];
if (!allowedOrigins.includes('http://localhost:3000')) allowedOrigins.push('http://localhost:3000');
if (!allowedOrigins.includes('http://127.0.0.1:3000')) allowedOrigins.push('http://127.0.0.1:3000');

const matchers = allowedOrigins.map(entry => {
  if (!entry) return entry;
  // allow regex entries if given like "/\\.vercel\\.app$/"
  if (entry.startsWith('/') && entry.endsWith('/')) {
    try { return new RegExp(entry.slice(1, -1)); } catch (e) { return entry; }
  }
  return entry;
});

// optional debug log
console.log('[BOOT] allowed origins:', allowedOrigins);

// --- CORS middleware using dynamic origin check ---
function originChecker(reqOrigin, callback) {
  if (!reqOrigin) {
    // no origin (same-origin requests like curl or server-side) -> allow
    return callback(null, true);
  }
  for (const m of matchers) {
    if (typeof m === 'string') {
      if (m === reqOrigin) {
        console.debug('[CORS] origin allowed (string):', reqOrigin);
        return callback(null, true);
      }
    } else if (m instanceof RegExp) {
      if (m.test(reqOrigin)) {
        console.debug('[CORS] origin allowed (regex):', reqOrigin);
        return callback(null, true);
      }
    }
  }
  console.warn('[CORS] blocked origin:', reqOrigin);
  return callback(new Error('Not allowed by CORS'));
}

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// use CORS with credentials true (so cookies can be sent)
app.use(cors({
  origin: originChecker,
  credentials: true,
  exposedHeaders: ['set-cookie'],
  optionsSuccessStatus: 204
}));

// respond to preflight with appropriate headers (extra safety)
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', req.header('Access-Control-Request-Headers') || 'Content-Type');
  res.header('Access-Control-Allow-Methods', req.header('Access-Control-Request-Method') || 'GET,POST,PUT,DELETE,OPTIONS');
  res.sendStatus(204);
});

// serve uploads if present
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (fs.existsSync(uploadsDir)) {
  app.use('/uploads', express.static(uploadsDir));
  console.log('[BOOT] Serving uploads folder at /uploads');
}

// helper: try multiple require candidates (useful for different layouts)
function tryRequire(...candidates) {
  for (const cand of candidates) {
    try {
      const full = path.join(__dirname, cand);
      if (fs.existsSync(full)) return require(full);
      if (fs.existsSync(full + '.js')) return require(full + '.js');
      if (fs.existsSync(full + '.cjs')) return require(full + '.cjs');
    } catch (err) {
      // continue trying others
    }
  }
  return null;
}

// --- Mount OTP routes (multiple mount points for frontend compatibility) ---
const otpRouter = tryRequire(
  'src/routes/otpRoutes.cjs',
  'src/routes/otpRoutes.js',
  'routes/otpRoutes.cjs',
  'routes/otpRoutes.js'
);

if (otpRouter) {
  // mount the OTP router at several endpoints so frontend candidate probes succeed
  app.use('/api/auth', otpRouter);      // POST /api/auth/send-otp or /api/auth/verify-otp
  app.use('/api/otp', otpRouter);       // POST /api/otp/send and /api/otp/verify
  app.use('/otpRoutes', otpRouter);     // POST /otpRoutes/send etc (some apps)
  console.log('[BOOT] Mounted OTP routes at /api/auth, /api/otp and /otpRoutes');
} else {
  console.warn('[BOOT] OTP routes not found — OTP endpoints will 404');
}

// --- Mount product routes ---
const productRoutes = tryRequire(
  'src/routes/productRoutes.cjs',
  'src/routes/productRoutes.js',
  'routes/productRoutes.cjs',
  'routes/productRoutes.js'
);
if (productRoutes) {
  app.use('/api/products', productRoutes);
  console.log('[BOOT] Mounted productRoutes at /api/products');
} else {
  console.warn('[BOOT] productRoutes not found');
}

// --- Mount admin product routes (optional) ---
const adminProductRoutes = tryRequire(
  'src/routes/adminProduct.cjs',
  'src/routes/adminProduct.js',
  'routes/adminProduct.cjs',
  'routes/adminProduct.js'
);
if (adminProductRoutes) {
  app.use('/api/admin/products', adminProductRoutes);
  console.log('[BOOT] Mounted admin product routes at /api/admin/products');
}

// --- Optional: mount an 'auth' index router if present (older layout) ---
const authIndex = tryRequire(
  'src/routes/auth.cjs',
  'src/routes/auth.js',
  'routes/auth.cjs',
  'routes/auth.js',
  'src/routes/authRoutes.cjs',
  'src/routes/authRoutes.js'
);
if (authIndex) {
  app.use('/api/auth', authIndex);
  console.log('[BOOT] Mounted auth router at /api/auth (index)');
}

// health check
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// final API 404
app.use('/api', (req, res) => {
  res.status(404).json({ ok: false, message: 'API endpoint not found', path: req.originalUrl });
});

// start server
const PORT = process.env.PORT || process.env.APP_PORT || 4000;
const MONGO = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL || null;

async function start() {
  if (MONGO) {
    try {
      const mongooseOpts = { useNewUrlParser: true, useUnifiedTopology: true };
      console.log('[BOOT] Connecting to MongoDB...');
      await mongoose.connect(MONGO, mongooseOpts);
      console.log('[BOOT] MongoDB connected');
    } catch (err) {
      console.warn('[BOOT] MongoDB connection failed:', err && err.message ? err.message : err);
    }
  } else {
    console.log('[BOOT] No MongoDB configured (continuing without DB)');
  }

  app.listen(PORT, () => {
    console.log(`[BOOT] Server listening on port ${PORT}`);
  });
}

start().catch(err => {
  console.error('[BOOT] Fatal start error:', err && (err.stack || err));
  process.exit(1);
});

module.exports = app;
