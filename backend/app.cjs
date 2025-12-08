'use strict';

/**
 * Canonical backend/app.cjs
 * - Connects to MongoDB before mounting routes / starting server
 * - Hard-mounts /api/uploadRoutes to fix Render not loading it
 * - Mounts src/routes index at /api
 * - Graceful error handling
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// ---- Middleware ----
const rawOrigins = (process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGINS || '').trim();
let allowedOrigins = rawOrigins ? rawOrigins.split(',').map(s => s.trim()).filter(Boolean) : [];
if (!allowedOrigins.includes('http://localhost:3000')) allowedOrigins.push('http://localhost:3000');

const allowedMatchers = allowedOrigins.map(entry => {
  if (!entry) return entry;
  if (entry.length > 2 && entry.startsWith('/') && entry.endsWith('/')) {
    try { return new RegExp(entry.slice(1, -1)); } catch(e) { return entry; }
  }
  return entry;
});

const allowVercelPreview = origin => /\.vercel\.app$/.test(origin);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    for (const m of allowedMatchers) {
      if (typeof m === 'string') {
        if (m === origin) return cb(null, true);
      } else if (m instanceof RegExp) {
        if (m.test(origin)) return cb(null, true);
      }
    }
    if (allowVercelPreview(origin)) return cb(null, true);
    console.warn(`[CORS] Blocked origin: ${origin}`);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  exposedHeaders: ['set-cookie'],
  optionsSuccessStatus: 204
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// static uploads if present
const uploadsDir = path.join(__dirname, 'uploads');
if (fs.existsSync(uploadsDir)) app.use('/uploads', express.static(uploadsDir));

// ---- Helper: tryRequire multiple candidates ----
function tryRequire(...candidates) {
  for (const cand of candidates) {
    const full = path.join(__dirname, cand);
    try {
      if (
        fs.existsSync(full) ||
        fs.existsSync(`${full}.js`) ||
        fs.existsSync(`${full}.cjs`) ||
        fs.existsSync(`${full}.mjs`)
      ) {
        return require(full);
      }
    } catch (err) {
      console.warn(`[BOOT] tryRequire failed for ${full}: ${err && err.message}`);
    }
  }
  return null;
}

// ------------------------------------------------------------------------
// ⭐⭐⭐ HARD-MOUNT uploadRoutes BEFORE ANYTHING ELSE (Render FIX)
// ------------------------------------------------------------------------
try {
  const uploadRoutes = require('./src/routes/uploadRoutes.cjs');
  app.use('/api/uploadRoutes', uploadRoutes);
  console.log('[BOOT] Hard-mounted /api/uploadRoutes');
} catch (err) {
  console.error('[BOOT ERROR] Could not load uploadRoutes.cjs:', err.message);
}

// ---- Mount routes (called after DB connect) ----
function mountRoutes() {
  // mount src/routes index at /api if present
  const routesIndex = tryRequire(
    'src/routes/index.cjs',
    'src/routes/index.js',
    'src/routes',
    'routes/index.cjs',
    'routes/index.js'
  );

  if (routesIndex) {
    app.use('/api', routesIndex);
    console.log('[BOOT] Mounted src/routes (index) at /api');
  } else {
    console.log('[BOOT] No src/routes index found to mount at /api');
  }

  // explicit auth mount as fallback
  const explicitAuth = tryRequire(
    'src/routes/auth.cjs',
    'src/routes/auth.js',
    'routes/auth.cjs',
    'routes/auth.js',
    'src/routes/authRoutes.cjs',
    'src/routes/authRoutes.js'
  );

  if (explicitAuth) {
    app.use('/api/auth', explicitAuth);
    console.log('[BOOT] Mounted explicit auth router at /api/auth');
  }

  // minimal /api/health if nothing else present
  app.get('/api/health', (req, res) => {
    res.json({
      ok: true,
      env: process.env.NODE_ENV || 'development',
      time: new Date().toISOString()
    });
  });

  // 404 handler
  app.use((req, res, next) => {
    res.status(404).send(`Cannot ${req.method} ${req.originalUrl}`);
  });

  // error handler
  app.use((err, req, res, next) => {
    if (err && err.message && /CORS|Not allowed/.test(err.message)) {
      console.warn(`[ERROR] CORS error for origin ${req.headers.origin}: ${err.message}`);
      return res.status(403).json({
        success: false,
        error: 'CORS blocked: origin not allowed'
      });
    }
    console.error(err && err.stack ? err.stack : err);
    const status = err && err.status ? err.status : 500;
    res.status(status).json({
      error: err && err.name ? err.name : 'ServerError',
      message: err && err.message ? err.message : 'Internal server error'
    });
  });
}

// ---- Connect to MongoDB then start server ----
const MONGO =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.DATABASE_URL ||
  process.env.MONGO;

const PORT = process.env.PORT || process.env.APP_PORT || 4000;

async function start() {
  if (!MONGO) {
    console.warn('[BOOT] No MONGO URI found.');
    mountRoutes();
    app.listen(PORT, () =>
      console.log(`Server listening on ${PORT} (no DB configured)`)
    );
    return;
  }

  mongoose.set('strictQuery', false);

  try {
    console.log('[BOOT] Connecting to MongoDB...');
    await mongoose.connect(MONGO, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000
    });
    console.log('[BOOT] MongoDB connected');
  } catch (err) {
    console.error('[BOOT] MongoDB connection failed:', err.message);
  }

  mountRoutes();

  app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
  });
}

if (require.main === module) {
  start().catch(err => {
    console.error('Fatal start error:', err.stack || err);
    process.exit(1);
  });
}

module.exports = app;
