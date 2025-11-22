// backend/app.cjs
// Full replacement (CommonJS)
// - mounts product routes, admin routes, presign/upload helpers when present
// - dev-friendly local upload endpoint when STORAGE_PROVIDER !== 's3' or NODE_ENV==='development'
// - detailed CORS debug output to help diagnose origin mismatches
'use strict';

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const { createRequire } = require('module');
const requireLocal = createRequire(__filename);
const dotenv = require('dotenv');

dotenv.config(); // load backend/.env if present

// --- basic config ---
const PORT = process.env.PORT || 4000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || null;
const NODE_ENV = (process.env.NODE_ENV || 'production').toLowerCase();

// --- helpers: canonicalize & byte debug ---
function canonicalizeOrigin(raw) {
  if (!raw) return raw;
  try {
    const u = new URL(String(raw).trim());
    return u.origin;
  } catch (e) {
    return String(raw).trim().replace(/\/+$/, '').toLowerCase();
  }
}

function bytesOfString(s) {
  if (s == null) return [];
  const arr = [];
  for (let i = 0; i < s.length; i++) arr.push(s.charCodeAt(i));
  return arr;
}
function showByteDebug(label, s) {
  try {
    console.log(`[BYTE-DUMP] ${label}: "${s}"`);
    console.log(`[BYTE-DUMP] ${label}-len: ${s ? s.length : 0}, bytes:`, bytesOfString(String(s)).slice(0, 200));
  } catch (e) {
    console.warn(`[BYTE-DUMP] failed for ${label}`, e && e.message ? e.message : e);
  }
}

// --- S3 env inspection ---
function s3EnvStatus() {
  const s3BucketRaw = process.env.S3_BUCKET ?? process.env.AWS_S3_BUCKET;
  const S3_BUCKET = typeof s3BucketRaw === 'string' && s3BucketRaw.trim() ? String(s3BucketRaw).trim() : null;
  return {
    S3_BUCKET,
    missing: [
      !process.env.STORAGE_PROVIDER ? 'STORAGE_PROVIDER' : null,
      !process.env.AWS_ACCESS_KEY_ID ? 'AWS_ACCESS_KEY_ID' : null,
      !process.env.AWS_SECRET_ACCESS_KEY ? 'AWS_SECRET_ACCESS_KEY' : null,
      !process.env.AWS_REGION && !process.env.AWS_DEFAULT_REGION ? 'AWS_REGION' : null,
      !S3_BUCKET ? 'S3_BUCKET' : null,
    ].filter(Boolean)
  };
}

// --- build allowed origins from envs ---
function buildAllowedOrigins() {
  const set = new Set();
  const raw = {
    CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS || null,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || null,
    FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || process.env.CLIENT_ORIGIN || null,
  };

  if (raw.CORS_ALLOWED_ORIGINS && String(raw.CORS_ALLOWED_ORIGINS).trim()) {
    String(raw.CORS_ALLOWED_ORIGINS)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((s) => set.add(canonicalizeOrigin(s)));
  }

  if (raw.ALLOWED_ORIGINS && String(raw.ALLOWED_ORIGINS).trim()) {
    String(raw.ALLOWED_ORIGINS)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((s) => set.add(canonicalizeOrigin(s)));
  }

  if (raw.FRONTEND_ORIGIN && String(raw.FRONTEND_ORIGIN).trim()) {
    set.add(canonicalizeOrigin(raw.FRONTEND_ORIGIN));
  }

  // always include common local dev origins
  set.add(canonicalizeOrigin('http://localhost:3000'));
  set.add(canonicalizeOrigin('http://127.0.0.1:3000'));
  set.add(canonicalizeOrigin('http://localhost:4000'));

  return { raw, normalized: Array.from(set), set };
}

// --- admin token helper ---
function isAdminAuthorized(req) {
  const auth = req.headers.authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!ADMIN_TOKEN) return true; // allow when no admin token configured
  if (!token) return false;
  return token === ADMIN_TOKEN;
}

// --- safe require helper using createRequire (CommonJS) ---
async function tryRequire(p) {
  try {
    return requireLocal(p);
  } catch (e) {
    return null;
  }
}

// --- attempt Mongo connect if configured (best-effort) ---
async function connectMongoIfConfigured() {
  let mongoose = null;
  try {
    mongoose = requireLocal('mongoose');
  } catch (e) {
    // not installed; skip
  }
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || null;
  if (!mongoose) {
    console.warn('mongoose module not available (not installed). Skipping MongoDB connect.');
    return;
  }
  if (!uri) {
    console.warn('MONGODB_URI not set — skipping mongo connect');
    return;
  }
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✔ MongoDB connected (app.cjs)');
  } catch (err) {
    console.error('✖ MongoDB connection failed (app.cjs):', err && (err.stack || err));
  }
}

// --- main bootstrap ---
(async function main() {
  console.log('Starting backend (CommonJS app.cjs)');
  console.log('ENV STORAGE_PROVIDER=', process.env.STORAGE_PROVIDER || '(none)');
  const s3st = s3EnvStatus();
  console.log('S3_BUCKET detected=', s3st.S3_BUCKET || '<missing>');

  const allowed = buildAllowedOrigins();
  console.log('CORS_ALLOWED_ORIGINS raw (CORS_ALLOWED_ORIGINS):', JSON.stringify(allowed.raw.CORS_ALLOWED_ORIGINS));
  console.log('ALLOWED_ORIGINS raw (ALLOWED_ORIGINS):', JSON.stringify(allowed.raw.ALLOWED_ORIGINS));
  console.log('FRONTEND_ORIGIN (FRONTEND_ORIGIN/CLIENT_ORIGIN):', JSON.stringify(allowed.raw.FRONTEND_ORIGIN));
  console.log('CORS allowed normalized list:', allowed.normalized);

  // try connecting to Mongo (non-fatal)
  await connectMongoIfConfigured().catch((e) => console.warn('Mongo connect error (ignored):', e));

  const app = express();

  // CORS options with debugging
  const corsOptions = {
    origin: function (incomingOrigin, callback) {
      const incomingRaw = incomingOrigin || '(no-origin)';
      const incomingNorm = canonicalizeOrigin(incomingRaw);
      console.log(`[CORS DEBUG] incoming raw: ${incomingRaw} normalized: ${incomingNorm}`);

      if (!incomingOrigin) {
        // server-to-server or curl (no Origin header)
        console.log('[CORS DEBUG] no Origin header — allowing');
        return callback(null, true);
      }

      if (allowed.set.has(incomingNorm)) {
        console.log(`[CORS DEBUG] origin allowed: ${incomingNorm}`);
        return callback(null, true);
      }

      // Not allowed: print helpful byte-dump diagnostics
      console.warn(`[CORS DEBUG] origin rejected: raw="${incomingRaw}" norm="${incomingNorm}"`);
      showByteDebug('incoming', incomingRaw);
      allowed.normalized.forEach((a, idx) => showByteDebug(`allowed_norm[${idx}]`, a));
      if (allowed.raw.CORS_ALLOWED_ORIGINS) showByteDebug('CORS_ALLOWED_ORIGINS_raw', allowed.raw.CORS_ALLOWED_ORIGINS);

      return callback(new Error(`CORS policy: origin ${incomingRaw} not allowed`), false);
    },
    credentials: true,
    optionsSuccessStatus: 204
  };

  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));
  app.use(express.json({ limit: '12mb' }));
  app.use(express.urlencoded({ extended: true, limit: '12mb' }));

  app.use(session({
    secret: process.env.SESSION_SECRET || 'keyboard_cat_dev_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { sameSite: 'none', secure: false, httpOnly: true, maxAge: 24 * 3600 * 1000 }
  }));

  app.use(cookieParser());

  // ensure uploads folder exists and serve it
  const uploadDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadDir)) {
    try { fs.mkdirSync(uploadDir, { recursive: true }); } catch (e) { console.warn('Could not create uploads dir:', e); }
  }
  app.use('/uploads', express.static(uploadDir));

  // multer disk storage (used for local uploads)
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ts = Date.now();
      const safe = file.originalname.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '');
      cb(null, `${ts}-${safe}`);
    }
  });
  const upload = multer({ storage });

  // --- attempt to mount known helper routes if they exist ---
  const routesToTry = [
    { path: './src/routes/presign-get.cjs', mount: '/api/presign-get' },
    { path: './src/routes/presign.cjs', mount: '/api/presign' },
    { path: './src/routes/admin-presign.cjs', mount: '/admin-api' },
    { path: './src/routes/upload.cjs', mount: '/api' },
    { path: './src/routes/upload.js', mount: '/api' }
  ];

  for (const r of routesToTry) {
    try {
      const mod = await tryRequire(r.path);
      if (mod) {
        app.use(r.mount, mod);
        console.log(`Mounted ${r.path} at ${r.mount}`);
      }
    } catch (e) {
      console.warn(`Failed to mount ${r.path}:`, e && e.message ? e.message : e);
    }
  }

  // --- local admin upload endpoint (dev-friendly) ---
  // Mount only when STORAGE_PROVIDER !== 's3' OR NODE_ENV === 'development' to avoid interfering with S3 production flow.
  const storageProvider = (process.env.STORAGE_PROVIDER || '').toLowerCase();
  if (storageProvider !== 's3' || NODE_ENV === 'development') {
    // prefer to load a dedicated adminUpload route if present, otherwise use inline handler
    const adminUploadModule = await tryRequire('./src/routes/adminUpload.cjs');
    if (adminUploadModule) {
      app.use('/admin-api/products/upload', adminUploadModule);
      console.log('Mounted ./src/routes/adminUpload.cjs at /admin-api/products/upload (dev/local upload)');
    } else {
      // inline fallback handler
      app.post('/admin-api/products/upload', upload.any(), (req, res) => {
        try {
          if (!isAdminAuthorized(req)) return res.status(401).json({ ok: false, message: 'Unauthorized' });
          const files = req.files || [];
          if (!files.length) return res.status(400).json({ ok: false, message: 'No file uploaded' });
          const host = process.env.SERVER_URL || `http://localhost:${PORT}`;
          const out = files.map((f) => ({ filename: f.filename, url: `${host}/uploads/${encodeURIComponent(f.filename)}`, size: f.size }));
          return res.json(out);
        } catch (err) {
          console.error('[admin-upload] error:', err && (err.stack || err));
          return res.status(500).json({ ok: false, message: 'Upload failed' });
        }
      });
      console.log('Mounted inline dev admin upload handler at /admin-api/products/upload');
    }
  } else {
    console.log('STORAGE_PROVIDER=s3 configured — skipping local admin upload route.');
  }

  // --- health & debug endpoints ---
  app.get('/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));
  app.get('/_health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));
  app.get('/api/ping', (req, res) => res.json({ ok: true, msg: 'api ping' }));

  app.get('/__debug/env', (req, res) => {
    const s3info = s3EnvStatus();
    const storageProviderLower = (process.env.STORAGE_PROVIDER || '').toLowerCase();
    const presignReady = storageProviderLower === 's3' && !!s3info.S3_BUCKET && !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY;
    res.json({
      ok: true,
      now: new Date().toISOString(),
      STORAGE_PROVIDER: process.env.STORAGE_PROVIDER || null,
      S3_BUCKET_raw: process.env.S3_BUCKET ?? process.env.AWS_S3_BUCKET ?? null,
      S3_BUCKET_normalized: s3info.S3_BUCKET || null,
      hasAwsKeys: !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY,
      presignReady,
      ADMIN_TOKEN_set: !!process.env.ADMIN_TOKEN,
      FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || process.env.CLIENT_ORIGIN || null,
      CORS_ALLOWED_ORIGINS_raw: process.env.CORS_ALLOWED_ORIGINS || null,
      ALLOWED_ORIGINS_raw: process.env.ALLOWED_ORIGINS || null,
      allowed_normalized: allowed.normalized
    });
  });

  // --- explicit adminProduct mount if present ---
  try {
    const adminProductModule = await tryRequire('./src/routes/adminProduct.cjs');
    if (adminProductModule) {
      app.use('/admin-api', adminProductModule);
      console.log('Mounted ./src/routes/adminProduct.cjs at /admin-api');
    } else {
      console.log('adminProduct.cjs not found (skipped explicit mount)');
    }
  } catch (e) {
    console.warn('Failed to explicitly mount ./src/routes/adminProduct.cjs:', e && e.message ? e.message : e);
  }

  // --- public product routes mount ---
  try {
    let prodModule = await tryRequire('./src/routes/productRoutes.cjs');
    if (!prodModule) prodModule = await tryRequire('./src/routes/productRoutes.js');
    if (prodModule) {
      app.use('/products', prodModule);
      console.log('Mounted ./src/routes/productRoutes.* at /products');
    } else {
      console.log('productRoutes not found (skipped mounting /products). Looked for ./src/routes/productRoutes.cjs and ./src/routes/productRoutes.js');
    }
  } catch (e) {
    console.warn('Failed to mount productRoutes at /products:', e && e.message ? e.message : e);
  }

  // simple fallback for /api
  app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found' }));

  // --- global error handler ---
  app.use((err, req, res, next) => {
    try {
      console.error('Global error:', err && (err.stack || err));
      if (res.headersSent) return next(err);

      if (err && err.message && String(err.message).toLowerCase().includes('origin')) {
        // echo CORS headers so browsers surface the server error (useful for debugging)
        try {
          const originHeader = req.get('origin') || null;
          if (originHeader) {
            res.set('Access-Control-Allow-Origin', originHeader);
            res.set('Access-Control-Allow-Credentials', 'true');
            res.set('Vary', 'Origin');
          }
        } catch (e) { /* ignore */ }
        return res.status(403).json({ error: 'CORS blocked request', message: err.message });
      }

      const statusCode = err && err.status ? err.status : 500;
      const message = err && err.message ? err.message : 'Server error';
      return res.status(statusCode).json({ error: message });
    } catch (fatal) {
      console.error('Fatal error inside global error handler:', fatal && (fatal.stack || fatal));
      return res.status(500).json({ error: 'Server error' });
    }
  });

  app.listen(PORT, () => {
    console.log(`Backend (CommonJS app.cjs) listening on http://localhost:${PORT}`);
  });

})().catch((e) => {
  console.error('Fatal startup error (app.cjs):', e && (e.stack || e));
  process.exit(1);
});
