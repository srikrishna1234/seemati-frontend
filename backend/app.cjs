// backend/app.cjs
'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use((req, res, next) => {
  console.log('[REQ]', req.method, req.originalUrl);
  next();
});

// ---------- CORS setup using env (robust) ----------
const raw = (process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '').trim();
let allowedOrigins = raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : [];

// Always allow localhost dev
if (!allowedOrigins.includes('http://localhost:3000')) allowedOrigins.push('http://localhost:3000');

// Common live origins you use — only added if not in env (safe defaults)
const commonDefaults = [
  'https://seemati.in',
  'https://www.seemati.in',
  'https://admin.seemati.in'
];
for (const d of commonDefaults) if (!allowedOrigins.includes(d)) allowedOrigins.push(d);

console.log('[BOOT] Allowed CORS origins:', allowedOrigins);

app.use(cors({
  origin: (origin, cb) => {
    // allow non-browser tools (curl, server-to-server)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    // try match without trailing slash / lower-case normalisation
    const norm = origin.replace(/\/+$/, '').toLowerCase();
    if (norm.endsWith('.vercel.app')) return cb(null, true);

    for (const a of allowedOrigins) {
      if (a.replace(/\/+$/, '').toLowerCase() === norm) return cb(null, true);
    }
    console.warn('[CORS] blocked origin:', origin);
    return cb(null, true);
  },
  credentials: true,
  exposedHeaders: ['set-cookie'],
  optionsSuccessStatus: 204
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve uploads folder (if present)
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (fs.existsSync(uploadsDir)) {
  app.use('/uploads', express.static(uploadsDir));
  console.log('[BOOT] Serving uploads from /uploads');
}

// Helper: attempt to require multiple candidate paths and return the first module found
function tryRequire(...cands) {
  for (const cand of cands) {
    try {
      const full = path.join(__dirname, cand);
      if (fs.existsSync(full)) {
        console.log(`[BOOT] tryRequire found file: ${full}`);
        return require(full);
      }
      // try with common extensions
      if (fs.existsSync(full + '.js')) { console.log(`[BOOT] tryRequire found file: ${full}.js`); return require(full + '.js'); }
      if (fs.existsSync(full + '.cjs')) { console.log(`[BOOT] tryRequire found file: ${full}.cjs`); return require(full + '.cjs'); }
      if (fs.existsSync(full + '.mjs')) { console.log(`[BOOT] tryRequire found file: ${full}.mjs`); return require(full + '.mjs'); }
    } catch (err) {
      console.warn('[BOOT] tryRequire error for', cand, err && err.message);
      // keep trying other candidates
    }
  }
  return null;
}

// IMPORTANT: hard-mount uploadRoutes at both /api/uploadRoutes and /api/uploads for compatibility.
try {
  const uploadRoutes = tryRequire(
    'src/routes/uploadRoutes.cjs',
    'src/routes/uploadRoutes.js',
    'routes/uploadRoutes.cjs',
    'routes/uploadRoutes.js',
    './src/routes/uploadRoutes.cjs',
    './routes/uploadRoutes.cjs'
  );
  if (uploadRoutes) {
    app.use('/api/uploadRoutes', uploadRoutes);
    app.use('/api/uploads', uploadRoutes);
    console.log('[BOOT] Mounted uploadRoutes at /api/uploadRoutes and /api/uploads');
  } else {
    console.warn('[BOOT] uploadRoutes module not found — uploads will 404');
  }
} catch (err) {
  console.error('[BOOT] uploadRoutes mount failed:', err && err.message);
}

// Try mounting auth (OTP) router at common locations
try {
  const auth = tryRequire(
    // prefer exact path relative to this file
    './src/routes/authRoutes.cjs',
    './src/routes/authRoutes.js',
    './routes/authRoutes.cjs',
    './routes/authRoutes.js',
    './src/routes/auth.cjs',
    './src/routes/auth.js',
    './routes/auth.cjs',
    './routes/auth.js',
    // fallbacks without ./ for older layout (kept for compatibility)
    'src/routes/authRoutes.cjs',
    'src/routes/authRoutes.js',
    'routes/auth.cjs',
    'routes/auth.js'
  );

  if (auth) {
    app.use('/api/auth', auth);
    console.log('[BOOT] Mounted auth routes at /api/auth');
  } else {
    // also mount otpRoutes explicitly if present
    const otp = tryRequire(
      './src/routes/otpRoutes.cjs',
      './src/routes/otpRoutes.js',
      './routes/otpRoutes.cjs',
      './routes/otpRoutes.js',
      'src/routes/otpRoutes.cjs',
      'src/routes/otpRoutes.js',
      'routes/otpRoutes.cjs',
      'routes/otpRoutes.js'
    );
    if (otp) {
      app.use('/api/otp', otp);
      console.log('[BOOT] Mounted otpRoutes at /api/otp');
    } else {
      console.warn('[BOOT] auth/otp routes not mounted (not found)');
    }
  }
} catch (err) {
  console.error('[BOOT] auth/otp mount error:', err && err.message);
}

// Try mounting product routes
try {
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
} catch (err) {
  console.error('[BOOT] productRoutes mount error:', err && err.message);
}
// -------------------------
// ORDER ROUTES (CRITICAL)
// -------------------------
try {
  const orderRoutes = tryRequire(
    'src/routes/orders.cjs',
    'src/routes/orders.js',
    'routes/orders.cjs',
    'routes/orders.js'
  );

  if (orderRoutes) {
    app.use('/api/orders', orderRoutes);
    console.log('[BOOT] Mounted orderRoutes at /api/orders');
  } else {
    console.warn('[BOOT] orderRoutes not found');
  }
} catch (err) {
  console.error('[BOOT] orderRoutes mount error:', err && err.message);
}

// Admin product mount (optional)
try {
  const adminRoutes = tryRequire(
    'src/routes/adminProduct.cjs',
    'src/routes/adminProduct.js',
    'routes/adminProduct.cjs',
    'routes/adminProduct.js'
  );
  if (adminRoutes) {
  app.use(
    '/api/admin/products',
    adminRoutes.router || adminRoutes
  );
  console.log('[BOOT] Mounted adminProduct at /api/admin/products');
}

} catch (err) {
  console.error('[BOOT] adminProduct mount error:', err && err.message);
}
// -------------------------
// ADMIN ORDER ROUTES (EXPLICIT)
// -------------------------
try {
  const adminOrders = tryRequire(
    'src/routes/adminOrders.cjs',
    'src/routes/adminOrders.js',
    'routes/adminOrders.cjs',
    'routes/adminOrders.js'
  );

  if (adminOrders) {
    app.use('/api/admin', adminOrders.router || adminOrders);
    console.log('[BOOT] Mounted adminOrders at /api/admin/orders');
  } else {
    console.warn('[BOOT] adminOrders not found');
  }
} catch (err) {
  console.error('[BOOT] adminOrders mount error:', err && err.message);
}

// Generic health endpoint
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Final API 404 fallback (detailed)
app.use('/api', (req, res) => {
  res.status(404).json({ ok: false, message: 'API endpoint not found', path: req.originalUrl });
});

// Start server
const PORT = process.env.PORT || process.env.APP_PORT || 4000;
async function start() {
  const MONGO = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL || null;
  if (MONGO) {
    try {
      console.log('[BOOT] Connecting to MongoDB...');
      await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
      console.log('[BOOT] MongoDB connected');
    } catch (err) {
      console.warn('[BOOT] MongoDB connect failed:', err && err.message ? err.message : err);
    }
  } else {
    console.log('[BOOT] No MONGO configured (continuing without DB)');
  }

  app.listen(PORT, () => {
    console.log(`[BOOT] Server listening on port ${PORT}`);
  });
}

if (require.main === module) start();

module.exports = app;
