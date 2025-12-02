// backend/app.cjs
// Single-file replacement (safe)
// - Connects to MongoDB using MONGO_URI
// - Robust CORS (non-throwing, supports comma-separated FRONTEND_URL)
// - Conditionally mounts optional routes (authRoutes) to avoid missing-module logs
// - Mounts new uploadRoutes (S3-backed) if present
// - Serves /uploads statically only for non-production local dev
// - Basic health endpoint and error handling
// - Adds backward-compatible /admin-api mounts for product & upload routes
// - Conditionally mounts sitemap route if file present (sitemap.cjs or sitemap.js)

'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const cors = require('cors');

require('dotenv').config();

const app = express();

// Configuration / env
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const RAW_FRONTEND = process.env.FRONTEND_URL || process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URLS || process.env.ALLOWED_ORIGINS || 'https://seemati.in';
const ALLOW_CREDENTIALS = (process.env.CORS_ALLOW_CREDENTIALS || 'true').toString().toLowerCase() === 'true';

// ---- Basic middleware
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ---- CORS config (safe, non-throwing)
// Supports comma-separated list of allowed origins in RAW_FRONTEND.
// If RAW_FRONTEND is exactly "*", allow all origins.
(function setupCors() {
  const raw = String(RAW_FRONTEND || '').trim();
  const allowList = raw === '' ? [] : raw.split(',').map(s => s.trim()).filter(Boolean);
  const allowAll = allowList.length === 1 && allowList[0] === '*';

  const corsOptions = {
    origin: function(origin, callback) {
      // allow requests with no origin (like curl or server-to-server)
      if (!origin) return callback(null, true);
      if (allowAll) return callback(null, true);

      try {
        const originOrigin = new URL(origin).origin;
        if (allowList.includes(origin) || allowList.includes(originOrigin)) {
          return callback(null, true);
        }
      } catch (e) {
        if (allowList.includes(origin)) return callback(null, true);
      }
      // NOT allowed — return false (do not throw)
      return callback(null, false);
    },
    credentials: ALLOW_CREDENTIALS,
    optionsSuccessStatus: 200
  };

  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));
  console.log('CORS configured — allowed origins:', allowList.length ? allowList : '[none specified — default single origin used]');
})();

// Optional: health endpoint
app.get('/_health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// ---- MongoDB connection
(async function connectDB() {
  if (!MONGO_URI) {
    console.error('MONGO_URI not set. Exiting.');
    process.exit(1);
  }
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
})();

// ---- Mount API routes (safe / conditional mounting)
// This block mounts uploadRoutes and productRoutes under both:
//   /api/products  (primary current API)
//   /admin-api/products  (backwards-compatible shim used by admin UI)
(() => {
  try {
    const uploadRoutesPath = path.join(__dirname, 'src', 'routes', 'uploadRoutes.cjs');
    const productRoutesPath = path.join(__dirname, 'src', 'routes', 'productRoutes.cjs');

    // uploadRoutes (if present)
    if (fs.existsSync(uploadRoutesPath)) {
      const uploadRoutes = require('./src/routes/uploadRoutes.cjs');

      // Primary mount
      app.use('/api/products', uploadRoutes);

      // Backwards-compatible shim for older frontend paths that use /admin-api
      app.use('/admin-api/products', uploadRoutes);

      console.log('Mounted uploadRoutes at /api/products and /admin-api/products');
    } else {
      console.log('uploadRoutes file not found — skipping uploadRoutes mount.');
    }

    // productRoutes (if present)
    if (fs.existsSync(productRoutesPath)) {
      const productRoutes = require('./src/routes/productRoutes.cjs');

      // Primary mount
      app.use('/api/products', productRoutes);

      // Backwards-compatible shim
      app.use('/admin-api/products', productRoutes);

      console.log('Mounted productRoutes at /api/products and /admin-api/products');
    } else {
      console.log('productRoutes file not found — skipping productRoutes mount.');
    }
  } catch (err) {
    console.warn('Failed to mount product/upload routes:', String(err));
  }
})();

// Safe conditional mount for authRoutes (avoid noisy missing-module error)
(() => {
  try {
    const authRoutesPath = path.join(__dirname, 'src', 'routes', 'authRoutes.cjs');
    if (fs.existsSync(authRoutesPath)) {
      const authRoutes = require('./src/routes/authRoutes.cjs');
      app.use('/api/auth', authRoutes);
      console.log('Mounted authRoutes');
    } else {
      console.log('authRoutes file not present — skipping mount (ok).');
    }
  } catch (err) {
    console.warn('authRoutes found but failed to mount:', String(err));
  }
})();

// ---- Sitemap route mounting (conditionally)
// Looks for either src/routes/sitemap.cjs or src/routes/sitemap.js (common patterns).
// If found, mount it. Otherwise, if a static public/sitemap.xml exists, note that.
// This is intentionally non-fatal — missing sitemap will not crash the server.
(() => {
  try {
    const sitemapCjs = path.join(__dirname, 'src', 'routes', 'sitemap.cjs');
    const sitemapJs = path.join(__dirname, 'src', 'routes', 'sitemap.js');
    const publicSitemap = path.join(__dirname, '..', 'public', 'sitemap.xml'); // adjust if your public folder is elsewhere
    let mounted = false;

    if (fs.existsSync(sitemapCjs)) {
      const sitemapRouter = require('./src/routes/sitemap.cjs');
      // Expect the router to handle GET /sitemap.xml or provide subpaths
      app.use('/', sitemapRouter);
      console.log('Mounted sitemap router from src/routes/sitemap.cjs');
      mounted = true;
    } else if (fs.existsSync(sitemapJs)) {
      const sitemapRouter = require('./src/routes/sitemap.js');
      app.use('/', sitemapRouter);
      console.log('Mounted sitemap router from src/routes/sitemap.js');
      mounted = true;
    } else if (fs.existsSync(publicSitemap)) {
      console.log('No sitemap route found, but public/sitemap.xml exists — ensure your frontend/static host serves it at /sitemap.xml');
      // Optionally, you can serve it statically from backend for local testing:
      if (process.env.SERVE_STATIC_SITEMAP === 'true') {
        app.get('/sitemap.xml', (req, res) => {
          res.sendFile(publicSitemap);
        });
        console.log('Serving public/sitemap.xml at /sitemap.xml (SERVE_STATIC_SITEMAP=true)');
        mounted = true;
      }
    } else {
      console.log('No sitemap route or static sitemap.xml found — skipping sitemap mount.');
    }

    if (!mounted) {
      // Not an error; just informative
    }
  } catch (err) {
    console.warn('Failed to mount sitemap route (non-fatal):', String(err));
  }
})();

// ---- Static uploads only for local dev (not for production)
if (process.env.NODE_ENV !== 'production') {
  const uploadsDir = path.join(__dirname, 'uploads');
  if (fs.existsSync(uploadsDir)) {
    app.use('/uploads', express.static(uploadsDir));
    console.log('Static /uploads mounted for local dev only');
  } else {
    console.log('Local uploads dir not found; static /uploads not mounted.');
  }
}

// ---- Error handling
app.use((err, req, res, next) => {
  // Log full stack for server-side visibility
  console.error('Unhandled error:', err && err.stack ? err.stack : err);
  if (res.headersSent) return next(err);
  // For CORS rejections the cors middleware calls callback(null, false) - it does not throw.
  // Here we send a JSON error so logs include stack but clients get a safe response.
  res.status(500).json({ error: err && err.message ? err.message : String(err) });
});

// ---- Start server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT} — env ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
