// backend/src/server.js
// Robust, compact CommonJS-compatible server entry used as a friendly merge resolution.
// Loads env, tries to connect to MongoDB (if configured), mounts basic upload/admin routes,
// and provides health/ping endpoints. Safe if models or optional routes are missing.
'use strict';

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const dotenv = require('dotenv');

dotenv.config();

const mongoose = (() => {
  try { return require('mongoose'); } catch (e) { return null; }
})();

// Use the environment-provided port (Render / Heroku / other platforms set this)
const PORT = process.env.PORT || 4000;
const FRONTEND_ORIGIN = (process.env.FRONTEND_ORIGIN || '').trim();

function canonicalizeOrigin(raw) {
  if (!raw) return raw;
  try { const u = new URL(String(raw).trim()); return u.origin; } catch (e) { return String(raw).trim().replace(/\/+$/, '').toLowerCase(); }
}

async function connectMongo() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || null;
  if (!mongoose) {
    console.warn('[server] mongoose not installed; skipping Mongo connect.');
    return;
  }
  if (!uri) {
    console.warn('[server] MONGODB_URI not set — skipping mongo connect');
    return;
  }
  try {
    // mongoose v7+ doesn't require legacy options; call connect with the URI only
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected (server.js)');
  } catch (e) {
    console.error('[server] Mongo connect failed:', e && (e.stack || e));
  }
}

async function main() {
  await connectMongo();

  const app = express();

  // Build allowed origins
  const allowed = new Set();
  if (FRONTEND_ORIGIN) allowed.add(canonicalizeOrigin(FRONTEND_ORIGIN));
  allowed.add(canonicalizeOrigin('http://localhost:3000'));
  allowed.add(canonicalizeOrigin('http://127.0.0.1:3000'));
  const extras = process.env.CORS_ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS || '';
  if (extras) extras.split(',').map(s => s.trim()).filter(Boolean).forEach(s => allowed.add(canonicalizeOrigin(s)));

  const corsOptions = {
    origin: function (incoming, cb) {
      if (!incoming) return cb(null, true); // server-to-server or curl
      const norm = canonicalizeOrigin(incoming);
      if (allowed.has(norm)) return cb(null, true);
      console.warn(`[CORS] rejecting origin=${incoming} normalized=${norm}`);
      return cb(new Error(`CORS policy: origin ${incoming} not allowed`), false);
    },
    credentials: true,
    optionsSuccessStatus: 204,
  };

  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));
  app.use(express.json({ limit: '12mb' }));
  app.use(express.urlencoded({ extended: true, limit: '12mb' }));

  app.use(session({
    secret: process.env.SESSION_SECRET || 'keyboard_cat_dev_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true }
  }));

  // static uploads -> ensure uploads path resolves to backend/uploads
  const uploadDir = path.join(__dirname, '..', 'uploads'); // __dirname is backend/src -> backend/uploads
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  app.use('/uploads', express.static(uploadDir));

  // multer for local admin uploads
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const safe = file.originalname.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '');
      cb(null, `${Date.now()}-${safe}`);
    }
  });
  const upload = multer({ storage });

  // local admin upload endpoint (used when STORAGE_PROVIDER !== 's3')
  app.post('/admin-api/products/upload', upload.any(), (req, res) => {
    try {
      const files = req.files || [];
      if (!files.length) return res.status(400).json({ ok: false, message: 'No files uploaded' });
      const host = process.env.SERVER_URL || `http://0.0.0.0:${PORT}`;
      const out = files.map(f => ({ filename: f.filename, url: `${host}/uploads/${f.filename}`, size: f.size }));
      return res.json(out);
    } catch (err) {
      console.error('[admin-upload] error:', err && (err.stack || err));
      return res.status(500).json({ ok: false, message: 'Upload failed' });
    }
  });

  // optional: try mount ./src/routes/* if present (best effort)
  const tryRequire = (p) => {
    try { return require(p); } catch (e) { return null; }
  };

  try {
    const productRoutes = tryRequire('./routes/productRoutes.cjs') || tryRequire('./routes/productRoutes.js') || tryRequire('./routes/productRoutes');
    if (productRoutes) {
      app.use('/products', productRoutes);
      console.log('[server] mounted productRoutes at /products');
    }
  } catch (e) { /* ignore */ }

  try {
    const adminRoutes = tryRequire('./routes/adminProduct.cjs') || tryRequire('./routes/adminProduct.js');
    if (adminRoutes) {
      app.use('/admin-api', adminRoutes);
      console.log('[server] mounted adminProduct at /admin-api');
    }
  } catch (e) { /* ignore */ }

  app.get('/api/ping', (req, res) => res.json({ ok: true, msg: 'api ping' }));
  app.get('/_health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));
  app.get('/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

  app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found' }));

  app.use((err, req, res, next) => {
    console.error('[server] Global error:', err && (err.stack || err));
    if (res.headersSent) return next(err);
    if (err && err.message && String(err.message).toLowerCase().includes('origin')) {
      try {
        const originHeader = req.get('origin') || null;
        if (originHeader) {
          res.set('Access-Control-Allow-Origin', originHeader);
          res.set('Access-Control-Allow-Credentials', 'true');
          res.set('Vary', 'Origin');
        }
      } catch (e) {}
      return res.status(403).json({ error: 'CORS blocked request', message: err.message });
    }
    return res.status(err && err.status ? err.status : 500).json({ error: err && err.message ? err.message : 'Server error' });
  });

  // Listen on the environment port (safe for Render/Heroku) and show friendly log
  app.listen(PORT, () => {
    const publicURL = process.env.SERVER_URL || `http://0.0.0.0:${PORT}`;
    console.log(`[server] listening on ${publicURL} (port ${PORT})`);
  });
}

main().catch(e => {
  console.error('[server] Fatal:', e && (e.stack || e));
  process.exit(1);
});
