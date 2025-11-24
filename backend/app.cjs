// backend/app.cjs
// Hotfix replacement: always allow vercel preview hosts (*.vercel.app).
// Includes robust tryRequire loader (CommonJS require + ESM dynamic import) and
// defensive route mounting with improved logging to diagnose adminProduct issues.
// Added: enhanced /uploads handler - serves local files, caches, and falls back to S3 redirect.
'use strict';

const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const { createRequire } = require('module');
const requireLocal = createRequire(__filename);
const { pathToFileURL } = require('url');
const dotenv = require('dotenv');
const mongoose = (() => {
  try { return require('mongoose'); } catch (e) { return null; }
})();

dotenv.config(); // load backend/.env if present

// --- config ---
const PORT = process.env.PORT || 4000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || null;

// --- helpers ---
function s3EnvStatus() {
  const s3BucketRaw = process.env.S3_BUCKET ?? process.env.AWS_S3_BUCKET ?? null;
  const S3_BUCKET = typeof s3BucketRaw === 'string' && s3BucketRaw.trim() ? String(s3BucketRaw).trim() : null;
  return {
    S3_BUCKET,
    missing: [
      !process.env.STORAGE_PROVIDER ? 'STORAGE_PROVIDER' : null,
      !process.env.AWS_ACCESS_KEY_ID ? 'AWS_ACCESS_KEY_ID' : null,
      !process.env.AWS_SECRET_ACCESS_KEY ? 'AWS_SECRET_ACCESS_KEY' : null,
      !process.env.AWS_REGION && !process.env.AWS_DEFAULT_REGION ? 'AWS_REGION' : null,
      !S3_BUCKET ? 'S3_BUCKET' : null,
    ].filter(Boolean),
  };
}

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

  // dev origins
  set.add(canonicalizeOrigin('http://localhost:3000'));
  set.add(canonicalizeOrigin('http://127.0.0.1:3000'));
  set.add(canonicalizeOrigin('http://localhost:4000'));

  return { raw, normalized: Array.from(set), set };
}

function isAdminAuthorized(req) {
  const auth = req.headers.authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!ADMIN_TOKEN) return true;
  if (!token) return false;
  return token === ADMIN_TOKEN;
}

// Robust tryRequire: attempt CommonJS require, then dynamic import for ESM.
// Returns module.exports (CommonJS) or default export / namespace (ESM).
async function tryRequire(relPath) {
  try {
    let resolved;
    try {
      resolved = requireLocal.resolve(relPath);
    } catch (resolveErr) {
      return null;
    }

    // CommonJS attempt
    try {
      return requireLocal(resolved);
    } catch (reqErr) {
      // continue to import
    }

    // dynamic import for ESM
    try {
      const fileUrl = pathToFileURL(resolved).href;
      const imported = await import(fileUrl);
      return imported && imported.default ? imported.default : imported;
    } catch (impErr) {
      // return null on failure
      return null;
    }
  } catch (err) {
    return null;
  }
}

async function connectMongoIfConfigured() {
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
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected (app.cjs)');
  } catch (err) {
    console.error('❌ MongoDB connection failed (app.cjs):', err && (err.stack || err));
  }
}

// --- main ---
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

  await connectMongoIfConfigured().catch(e => console.warn('Mongo connect error (ignored):', e));

  const app = express();

  // CORS: strict allowlist + automatic vercel.app acceptance (hotfix)
  const corsOptions = {
    origin: function (incomingOrigin, callback) {
      const incomingRaw = incomingOrigin || '(no-origin)';
      const incomingNorm = canonicalizeOrigin(incomingRaw);
      console.log(`[CORS DEBUG] incoming raw: ${incomingRaw} normalized: ${incomingNorm}`);

      // allow no origin (server-to-server / curl)
      if (!incomingOrigin) {
        console.log('[CORS DEBUG] no Origin header — allowing');
        return callback(null, true);
      }

      // exact allowlist
      if (allowed.set.has(incomingNorm)) {
        console.log(`[CORS DEBUG] origin allowed: ${incomingNorm}`);
        return callback(null, true);
      }

      // HOTFIX: automatically allow vercel preview hostnames
      try {
        const hostname = new URL(incomingNorm).hostname || '';
        if (hostname.endsWith('.vercel.app')) {
          console.log(`[CORS DEBUG] allowing vercel preview origin (auto): ${incomingNorm}`);
          return callback(null, true);
        }
      } catch (e) { /* ignore parse error */ }

      // rejected - show byte dumps to debug invisible chars
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

  // uploads dir at backend/uploads
  const uploadDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadDir)) {
    try { fs.mkdirSync(uploadDir, { recursive: true }); } catch (e) { console.warn('Could not create uploads dir:', e); }
  }

  // multer
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ts = Date.now();
      const safe = file.originalname.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '');
      cb(null, `${ts}-${safe}`);
    }
  });
  const upload = multer({ storage });

  // Enhanced /uploads handler:
  // - If local file exists in backend/uploads -> sendFile with cache headers
  // - Otherwise, if S3 bucket configured -> redirect to likely S3 candidate URL (products/ prefix and without)
  // - Otherwise return 404
  app.get('/uploads/*', (req, res, next) => {
    try {
      const rel = req.params[0] || '';
      const decoded = decodeURIComponent(rel);
      const localPath = path.join(uploadDir, decoded);

      console.log(`[UPLOADS] request for /uploads/${rel} -> decoded="${decoded}", localPath="${localPath}"`);

      if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
        // cache for a short time (you may increase in prod if immutable)
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
        return res.sendFile(localPath);
      }

      // try alternate encoded filename (sometimes '/' encoded as %2F etc)
      const altLocal = path.join(uploadDir, rel);
      if (fs.existsSync(altLocal) && fs.statSync(altLocal).isFile()) {
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.sendFile(altLocal);
      }

      // Not found locally -> attempt S3 fallback redirect if configured
      const s3Bucket = s3st.S3_BUCKET || process.env.S3_BUCKET || process.env.AWS_S3_BUCKET || null;
      const awsRegion = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || null;

      if (s3Bucket) {
        // Build candidate S3 URLs. We'll redirect to the most likely patterns.
        const candidates = [];

        // raw path (as requested)
        candidates.push(`https://${s3Bucket}.s3.amazonaws.com/${encodeURIComponent(rel)}`);

        // with region
        if (awsRegion) {
          candidates.push(`https://${s3Bucket}.s3.${awsRegion}.amazonaws.com/${encodeURIComponent(rel)}`);
        }

        // with products/ prefix (many uploads are stored under products/)
        candidates.push(`https://${s3Bucket}.s3.amazonaws.com/products/${encodeURIComponent(rel)}`);
        if (awsRegion) {
          candidates.push(`https://${s3Bucket}.s3.${awsRegion}.amazonaws.com/products/${encodeURIComponent(rel)}`);
        }

        // log and redirect to first candidate (this will typically be a 302)
        console.log('[UPLOADS] local file not found - redirecting to S3 candidate:', candidates[0]);
        return res.redirect(302, candidates[0]);
      }

      // No file & no S3 -> 404 with helpful message
      console.warn(`[UPLOADS] file not found locally and no S3 configured: /uploads/${rel}`);
      return res.status(404).send(`Cannot GET /uploads/${rel}`);
    } catch (err) {
      console.error('[UPLOADS] handler error:', err && (err.stack || err));
      return next(err);
    }
  });

  // try mount common route files (best-effort)
  const routesToTry = [
    { path: './src/routes/presign-get.cjs', mount: '/api/presign-get' },
    { path: './src/routes/presign.cjs', mount: '/api/presign' },
    { path: './src/routes/admin-presign.cjs', mount: '/admin-api' },
    { path: './src/routes/upload.cjs', mount: '/api' },
    { path: './src/routes/upload.js', mount: '/api' },
  ];

  for (const r of routesToTry) {
    try {
      const mod = await tryRequire(r.path);
      if (mod) {
        app.use(r.mount, mod);
        console.log(`Mounted ${r.path} at ${r.mount}`);
      }
    } catch (e) {
      console.warn(`Failed to mount ${r.path}:`, e && (e.stack || e));
    }
  }

  // local admin upload endpoint if not using S3 (keeps existing behavior)
  const storageProvider = (process.env.STORAGE_PROVIDER || '').toLowerCase();
  if (storageProvider !== 's3') {
    app.post('/admin-api/products/upload', upload.any(), (req, res) => {
      try {
        if (!isAdminAuthorized(req)) return res.status(401).json({ ok: false, message: 'Unauthorized' });
        const files = req.files || [];
        if (!files.length) return res.status(400).json({ ok: false, message: 'No file uploaded' });
        const host = process.env.SERVER_URL || `http://0.0.0.0:${PORT}`;
        const out = files.map(f => ({ filename: f.filename, url: `${host}/uploads/${f.filename}`, size: f.size }));
        return res.json(out);
      } catch (err) {
        console.error('[admin-upload] error:', err && (err.stack || err));
        return res.status(500).json({ ok: false, message: 'Upload failed' });
      }
    });
  } else {
    console.log('STORAGE_PROVIDER=s3 configured — skipping local admin upload route.');
  }

  // health & debug
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
      S3_BUCKET_normalized: s3info.S3_BUCKET,
      hasAwsKeys: !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY,
      presignReady,
      ADMIN_TOKEN_set: !!process.env.ADMIN_TOKEN,
      FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || process.env.CLIENT_ORIGIN || null,
      CORS_ALLOWED_ORIGINS_raw: process.env.CORS_ALLOWED_ORIGINS || null,
      ALLOWED_ORIGINS_raw: process.env.ALLOWED_ORIGINS || null,
      allowed_normalized: allowed.normalized,
      auto_allow_vercel_preview: true
    });
  });

  // Explicit attempt to mount adminProduct (improved logging)
  try {
    const candidatePaths = [
      './src/routes/adminProduct.cjs',
      './src/routes/adminProduct.js',
      './src/routes/adminProduct.mjs',
      './src/routes/adminProduct/index.cjs',
      './src/routes/adminProduct/index.js'
    ];
    let mounted = false;
    for (const p of candidatePaths) {
      try {
        const mod = await tryRequire(p);
        if (mod) {
          // If module is a function (express router factory) or router-like, mount directly
          app.use('/admin-api', mod);
          console.log(`Mounted ${p} at /admin-api`);
          mounted = true;
          break;
        }
      } catch (e) {
        console.warn(`Attempt to mount ${p} failed:`, e && (e.stack || e));
      }
    }
    if (!mounted) console.log('adminProduct module not found (explicit mounts skipped).');
  } catch (e) {
    console.warn('Failed during explicit adminProduct mount attempts:', e && (e.stack || e));
  }

  // public product routes
  try {
    let prodModule = await tryRequire('./src/routes/productRoutes.cjs');
    if (!prodModule) prodModule = await tryRequire('./src/routes/productRoutes.js');
    if (prodModule) {
      app.use('/products', prodModule);
      console.log('Mounted ./src/routes/productRoutes.* at /products');
    } else {
      console.log('productRoutes not found (skipped mounting /products).');
    }
  } catch (e) {
    console.warn('Failed to mount productRoutes at /products:', e && (e.stack || e));
  }

  // fallback /api 404
  app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found' }));

  // global error handler
  app.use((err, req, res, next) => {
    console.error('Global error:', err && (err.stack || err));
    if (res.headersSent) return next(err);

    if (err && err.message && String(err.message).toLowerCase().includes('origin')) {
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

    res.status(err && err.status ? err.status : 500).json({ error: err && err.message ? err.message : 'Server error' });
  });

  // listen
  app.listen(PORT, () => {
    const publicURL = process.env.SERVER_URL || `http://0.0.0.0:${PORT}`;
    console.log(`Backend (CommonJS app.cjs) listening on ${publicURL} (port ${PORT})`);
  });

})().catch(e => {
  console.error('Fatal startup error (app.cjs):', e && (e.stack || e));
  process.exit(1);
});

