// backend/app.cjs
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
const NODE_ENV = process.env.NODE_ENV || 'development';

// ---- Basic middleware
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));

// ---- Request header logger (non-production only to avoid noisy logs)
if (NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    const debugAll = String(process.env.DEBUG_HEADERS || '').toLowerCase() === 'true';
    if (debugAll) {
      console.log('Incoming request:', req.method, req.originalUrl, 'headers=', req.headers);
    } else {
      console.log('Incoming request:', req.method, req.originalUrl, 'origin=', req.get('origin'), 'referer=', req.get('referer'));
    }
    next();
  });
}

// ---- CORS config (safe, non-throwing)
(function setupCors() {
  const raw = String(RAW_FRONTEND || '').trim();
  const allowList = raw === '' ? [] : raw.split(',').map(s => s.trim()).filter(Boolean);
  const allowAll = allowList.length === 1 && allowList[0] === '*';

  const corsOptions = {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowAll) return callback(null, true);

      let originToCheck = origin;
      try { originToCheck = new URL(origin).origin; } catch (e) { originToCheck = origin; }

      if (allowList.includes(originToCheck) || allowList.includes(origin)) return callback(null, true);
      if (/\.vercel\.app$/i.test(originToCheck) || /\.vercel\.app$/i.test(origin)) return callback(null, true);

      console.warn(`CORS blocked origin: ${origin}`);
      return callback(null, false);
    },
    credentials: ALLOW_CREDENTIALS,
    optionsSuccessStatus: 200,
    exposedHeaders: ['set-cookie']
  };

  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));
  console.log('CORS configured — allowed origins (from env):', allowList.length ? allowList : '[none specified — default single origin used]');
})();

// ---- Fallback middleware: ensure CORS headers are present even behind proxies
app.use((req, res, next) => {
  try {
    const origin = req.get('origin');
    const raw = String(RAW_FRONTEND || '').trim();
    const allowList = raw === '' ? [] : raw.split(',').map(s => s.trim()).filter(Boolean);

    if (origin) {
      let originToCheck;
      try { originToCheck = new URL(origin).origin; } catch (e) { originToCheck = origin; }

      if (/\.vercel\.app$/i.test(originToCheck) || /\.vercel\.app$/i.test(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
      } else if (allowList.includes(originToCheck) || allowList.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', originToCheck);
        res.setHeader('Vary', 'Origin');
      }
    }

    res.setHeader('Access-Control-Allow-Credentials', String(!!ALLOW_CREDENTIALS));
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept,Origin');
    const vary = res.getHeader('Vary');
    if (!vary) res.setHeader('Vary', 'Origin');
  } catch (e) {
    console.warn('CORS fallback middleware failed:', String(e));
  }

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }
  next();
});

// Optional: health endpoint
app.get('/_health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// -----------------------------
// Debug echo endpoints (always present at app level)
// Useful to confirm what the frontend / browser is sending and ensure this app version is deployed.
// -----------------------------
app.get('/_debug/echo', (req, res) => {
  const payload = {
    ok: true,
    route: '/_debug/echo (GET)',
    headers: {
      origin: req.get('origin'),
      referer: req.get('referer'),
      'user-agent': req.get('user-agent')
    }
  };
  return res.json(payload);
});

app.post('/_debug/echo', (req, res) => {
  const payload = {
    ok: true,
    route: '/_debug/echo (POST)',
    headers: {
      origin: req.get('origin'),
      referer: req.get('referer'),
      'user-agent': req.get('user-agent')
    },
    body: req.body
  };
  return res.json(payload);
});
// -----------------------------

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
(() => {
  try {
    const uploadRoutesPath = path.join(__dirname, 'src', 'routes', 'uploadRoutes.cjs');
    const productRoutesPath = path.join(__dirname, 'src', 'routes', 'productRoutes.cjs');

    if (fs.existsSync(uploadRoutesPath)) {
      const uploadRoutes = require('./src/routes/uploadRoutes.cjs');
      app.use('/api/products', uploadRoutes);
      app.use('/admin-api/products', uploadRoutes);
      console.log('Mounted uploadRoutes at /api/products and /admin-api/products');
    } else {
      console.log('uploadRoutes file not found — skipping uploadRoutes mount.');
    }

    if (fs.existsSync(productRoutesPath)) {
      const productRoutes = require('./src/routes/productRoutes.cjs');
      app.use('/api/products', productRoutes);
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
(() => {
  try {
    const sitemapCjs = path.join(__dirname, 'src', 'routes', 'sitemap.cjs');
    const sitemapJs = path.join(__dirname, 'src', 'routes', 'sitemap.js');
    const publicSitemap = path.join(__dirname, '..', 'public', 'sitemap.xml');
    let mounted = false;

    if (fs.existsSync(sitemapCjs)) {
      const sitemapRouter = require('./src/routes/sitemap.cjs');
      app.use('/', sitemapRouter);
      console.log('Mounted sitemap router from src/routes/sitemap.cjs');
      mounted = true;
    } else if (fs.existsSync(sitemapJs)) {
      const sitemapRouter = require('./src/routes/sitemap.js');
      app.use('/', sitemapRouter);
      console.log('Mounted sitemap router from src/routes/sitemap.js');
      mounted = true;
    } else if (fs.existsSync(publicSitemap)) {
      console.log('No sitemap route found, but public/sitemap.xml exists — consider serving it at /sitemap.xml');
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
  } catch (err) {
    console.warn('Failed to mount sitemap route (non-fatal):', String(err));
  }
})();

// ---- Static uploads only for local dev (not for production)
if (NODE_ENV !== 'production') {
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
  console.error('Unhandled error:', err && err.stack ? err.stack : err);
  if (res.headersSent) return next(err);
  try {
    const origin = req.get('origin');
    if (origin) {
      res.setHeader('Access-Control-Allow-Credentials', String(!!ALLOW_CREDENTIALS));
      res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept,Origin');
      const vary = res.getHeader('Vary');
      if (!vary) res.setHeader('Vary', 'Origin');
    }
  } catch (e) { /* ignore */ }

  res.status(500).json({ error: err && err.message ? err.message : String(err) });
});

// ---- Start server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT} — env ${NODE_ENV}`);
});

module.exports = app;
