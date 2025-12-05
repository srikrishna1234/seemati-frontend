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
const { createRequire } = require('module');
const { pathToFileURL } = require('url');
const requireLocal = createRequire(__filename);

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

// Robust tryRequire that handles CommonJS require() and ESM import()
async function tryRequire(relPath) {
  try {
    let resolved;
    try {
      resolved = requireLocal.resolve(relPath);
    } catch (resolveErr) {
      return null;
    }

    // try require first (CommonJS)
    try {
      return requireLocal(resolved);
    } catch (reqErr) {
      // fall through to dynamic import
    }

    // try dynamic import for ESM
    try {
      const fileUrl = pathToFileURL(resolved).href;
      const imported = await import(fileUrl);
      return imported && imported.default ? imported.default : imported;
    } catch (impErr) {
      return null;
    }
  } catch (err) {
    return null;
  }
}

function listRoutesFromApp(appInstance) {
  const routes = [];
  if (!appInstance || !appInstance._router || !Array.isArray(appInstance._router.stack)) {
    return routes;
  }

  const stack = appInstance._router.stack;
  stack.forEach((layer) => {
    if (layer.route && layer.route.path) {
      const methods = layer.route.methods ? Object.keys(layer.route.methods).join(',').toUpperCase() : '';
      routes.push({ path: layer.route.path, methods });
    } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
      layer.handle.stack.forEach((handler) => {
        if (handler.route && handler.route.path) {
          const methods = handler.route.methods ? Object.keys(handler.route.methods).join(',').toUpperCase() : '';
          routes.push({ path: handler.route.path, methods });
        }
      });
    } else {
      // fallback: include regexp representation if available
      try {
        if (layer && layer.regexp) {
          routes.push({ path: String(layer.regexp), methods: '' });
        }
      } catch (e) {}
    }
  });

  return routes;
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
  try {
    const productRoutes = await tryRequire('./routes/productRoutes.cjs') || await tryRequire('./routes/productRoutes.js') || await tryRequire('./routes/productRoutes');
    if (productRoutes) {
      app.use('/products', productRoutes);
      console.log('[server] mounted productRoutes at /products');
    }
  } catch (e) { /* ignore */ }

  try {
    const adminRoutes = await tryRequire('./routes/adminProduct.cjs') || await tryRequire('./routes/adminProduct.js') || await tryRequire('./routes/adminProduct');
    if (adminRoutes) {
      app.use('/admin-api', adminRoutes);
      console.log('[server] mounted adminProduct at /admin-api');
    }
  } catch (e) { /* ignore */ }

  app.get('/api/ping', (req, res) => res.json({ ok: true, msg: 'api ping' }));
  app.get('/_health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));
  app.get('/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

  // Debug endpoint to enumerate mounted routes (temporary)
  app.get('/__routes', (req, res) => {
    try {
      const routes = listRoutesFromApp(app);
      return res.json({ ok: true, routes });
    } catch (err) {
      console.error('[__routes] error:', err && (err.stack || err));
      return res.status(500).json({ ok: false, error: 'Failed to enumerate routes' });
    }
  });

  // preserve old behavior: any /api/* fallback 404
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
