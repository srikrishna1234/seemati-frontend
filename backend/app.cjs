// backend/app.cjs
'use strict';

/**
 * Robust backend/app.cjs
 * - Connects to MongoDB (if configured) then mounts routes
 * - Hard-mounts upload routes and product routes explicitly
 * - Keeps helpful console logs for debugging route mounting
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// ---- Basic middleware ----
const rawOrigins = (process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGINS || '').trim();
let allowedOrigins = rawOrigins ? rawOrigins.split(',').map(s => s.trim()).filter(Boolean) : [];
if (!allowedOrigins.includes('http://localhost:3000')) allowedOrigins.push('http://localhost:3000');

const allowedMatchers = allowedOrigins.map(entry => {
  if (!entry) return entry;
  if (entry.startsWith('/') && entry.endsWith('/')) {
    try { return new RegExp(entry.slice(1, -1)); } catch (e) { return entry; }
  }
  return entry;
});

const allowVercelPreview = origin => typeof origin === 'string' && /\.vercel\.app$/.test(origin);

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

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// serve uploads dir if present
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (fs.existsSync(uploadsDir)) {
  app.use('/uploads', express.static(uploadsDir));
  console.log('[BOOT] Serving uploads folder at /uploads');
}

// helper: try multiple require candidates
function tryRequire(...candidates) {
  for (const cand of candidates) {
    try {
      const full = path.join(__dirname, cand);
      if (
        fs.existsSync(full) ||
        fs.existsSync(`${full}.js`) ||
        fs.existsSync(`${full}.cjs`) ||
        fs.existsSync(`${full}.mjs`)
      ) {
        return require(full);
      }
    } catch (err) {
      // continue trying others
    }
  }
  return null;
}

// ---- Hard-mount upload routes (Render-specific fix) ----
try {
  const uploadRoutes = tryRequire(
    'src/routes/uploadRoutes.cjs',
    'src/routes/uploadRoutes.js',
    'routes/uploadRoutes.cjs',
    'routes/uploadRoutes.js',
    './src/routes/uploadRoutes.cjs'
  );
  if (uploadRoutes) {
    // mount at both /api/uploadRoutes and /api/uploads for compatibility
    app.use('/api/uploadRoutes', uploadRoutes);
    app.use('/api/uploads', uploadRoutes);
    console.log('[BOOT] Mounted uploadRoutes at /api/uploadRoutes and /api/uploads');
  } else {
    console.warn('[BOOT] uploadRoutes not found to mount');
  }
} catch (err) {
  console.error('[BOOT ERROR] uploadRoutes mount failed:', err && err.message);
}

// ---- function to mount routes after DB connect or even without DB ----
function mountRoutes() {
  // 1) explicit productRoutes mount for frontend expectations
  try {
    const productRoutes = tryRequire(
      'src/routes/productRoutes.cjs',
      'src/routes/productRoutes.js',
      'routes/productRoutes.cjs',
      'routes/productRoutes.js',
      './src/routes/productRoutes.cjs',
      './routes/productRoutes.cjs'
    );
    if (productRoutes) {
      app.use('/api/products', productRoutes);
      console.log('[BOOT] Mounted productRoutes at /api/products');
    } else {
      console.warn('[BOOT] productRoutes not found to mount at /api/products');
    }
  } catch (err) {
    console.error('[BOOT] productRoutes mount error:', err && err.message);
  }

  // 2) admin product routes (if you have an admin-specific router)
  try {
    const adminRoutes = tryRequire(
      'src/routes/adminProduct.cjs',
      'src/routes/adminProduct.js',
      'routes/adminProduct.cjs',
      'routes/adminProduct.js',
      'src/routes/adminProductRoutes.cjs',
      'src/routes/adminProductRoutes.js'
    );
    if (adminRoutes) {
      app.use('/api/admin/products', adminRoutes);
      console.log('[BOOT] Mounted adminProduct at /api/admin/products');
    } else {
      // not an error — optional
      // console.log('[BOOT] no adminProduct router present');
    }
  } catch (err) {
    console.error('[BOOT] adminProduct mount error:', err && err.message);
  }

  // 3) attempt to mount a routes index (if you prefer central index)
  try {
    const routesIndex = tryRequire(
      'src/routes/index.cjs',
      'src/routes/index.js',
      'routes/index.cjs',
      'routes/index.js'
    );
    if (routesIndex) {
      app.use('/api', routesIndex);
      console.log('[BOOT] Mounted routes index at /api');
    } else {
      // index optional — not an error
    }
  } catch (err) {
    console.error('[BOOT] routes index mount error:', err && err.message);
  }

  // 4) optional auth explicit mount
  try {
    const auth = tryRequire(
      'src/routes/auth.cjs',
      'src/routes/auth.js',
      'routes/auth.cjs',
      'routes/auth.js',
      'src/routes/authRoutes.cjs',
      'src/routes/authRoutes.js'
    );
    if (auth) {
      app.use('/api/auth', auth);
      console.log('[BOOT] Mounted auth router at /api/auth');
    }
  } catch (err) {
    console.error('[BOOT] auth mount error:', err && err.message);
  }

  // health
  app.get('/api/health', (req, res) => {
    res.json({ ok: true, env: process.env.NODE_ENV || 'development', time: new Date().toISOString() });
  });

  // 404 handler for API paths
  app.use((req, res, next) => {
    res.status(404).send(`Cannot ${req.method} ${req.originalUrl}`);
  });

  // generic error handler
  app.use((err, req, res, next) => {
    if (err && err.message && /CORS|Not allowed/.test(err.message)) {
      console.warn(`[ERROR] CORS issue: ${err.message}`);
      return res.status(403).json({ success: false, error: 'CORS blocked: origin not allowed' });
    }
    console.error('[ERROR] Unhandled:', err && err.stack ? err.stack : err);
    const status = err && err.status ? err.status : 500;
    res.status(status).json({
      error: err && err.name ? err.name : 'ServerError',
      message: err && err.message ? err.message : 'Internal server error'
    });
  });
}

// ---- MongoDB connect & start server ----
const MONGO = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL || process.env.MONGO;
const PORT = process.env.PORT || process.env.APP_PORT || 4000;

async function start() {
  if (!MONGO) {
    console.warn('[BOOT] No MongoDB configured — mounting routes without DB');
    mountRoutes();
    app.listen(PORT, () => console.log(`Server listening on ${PORT} (no DB)`));
    return;
  }

  mongoose.set('strictQuery', false);

  try {
    console.log('[BOOT] Connecting to MongoDB...');
    await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('[BOOT] MongoDB connected');
  } catch (err) {
    console.error('[BOOT] MongoDB connect failed:', err && err.message);
  }

  mountRoutes();

  app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
}

if (require.main === module) {
  start().catch(err => {
    console.error('[FATAL] start error:', err && (err.stack || err));
    process.exit(1);
  });
}

module.exports = app;
