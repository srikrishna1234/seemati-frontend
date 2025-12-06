// backend/src/app.js
'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Config
const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const RAW_FRONTEND = process.env.FRONTEND_URL || process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URLS || process.env.ALLOWED_ORIGINS || 'http://localhost:3000';
const ALLOW_CREDENTIALS = (process.env.CORS_ALLOW_CREDENTIALS || 'true').toString().toLowerCase() === 'true';

// Middleware
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));

// ---- CORS setup ----
(function setupCors() {
  const raw = String(RAW_FRONTEND || '').trim();
  const allowList = raw === '' ? [] : raw.split(',').map(s => s.trim()).filter(Boolean);
  const allowAll = allowList.length === 1 && (allowList[0] === '*' || allowList[0] === '*');

  const corsOptions = {
    origin: function(origin, callback) {
      // allow requests with no origin (server-to-server or curl)
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
      // Not allowed - respond false (CORS middleware will send appropriate headers)
      return callback(null, false);
    },
    credentials: ALLOW_CREDENTIALS,
    optionsSuccessStatus: 200,
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization','Accept','X-Requested-With']
  };

  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));
  console.log('CORS configured — allowed origins:', allowList.length ? allowList : `[default ${RAW_FRONTEND}]`);
})();

// Health
app.get('/_health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// ---------- Mount API routes (conditionally) ----------
// Try to mount "authRoutes", "productRoutes", "uploadRoutes" etc. if present under backend/src/routes
function conditionalMount(routePath, mountAt) {
  try {
    if (fs.existsSync(routePath)) {
      const router = require(routePath);
      app.use(mountAt, router);
      console.log(`Mounted ${path.basename(routePath)} at ${mountAt}`);
      return true;
    }
  } catch (err) {
    console.warn(`Failed to mount ${routePath}:`, String(err));
  }
  return false;
}

const routesBase = path.join(__dirname, 'routes');

// Mount authRoutes (important)
conditionalMount(path.join(routesBase, 'authRoutes.cjs'), '/api/auth');

// Mount product / upload routes (if present)
conditionalMount(path.join(routesBase, 'productRoutes.cjs'), '/api/products');
conditionalMount(path.join(routesBase, 'uploadRoutes.cjs'), '/api/uploads');

// Backwards-compat shim for older admin-api paths (if productRoutes present)
if (fs.existsSync(path.join(routesBase, 'productRoutes.cjs'))) {
  const prodRouter = require('./routes/productRoutes.cjs');
  app.use('/admin-api/products', prodRouter);
}

// Serve uploads statically in dev only
if (NODE_ENV !== 'production') {
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (fs.existsSync(uploadsDir)) {
    app.use('/uploads', express.static(uploadsDir));
    console.log('Serving local /uploads (dev)');
  }
}

// Fallback API 404 (for any /api requests not matched)
app.use('/api', (req, res, next) => {
  res.status(404).json({ ok: false, message: 'API endpoint not found' });
});

// Generic error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err && err.stack ? err.stack : err);
  if (res.headersSent) return next(err);
  res.status(500).json({ ok: false, message: err && err.message ? err.message : String(err) });
});

// Start server when run directly
if (require.main === module) {
  const serverPort = process.env.PORT || 4000;
  app.listen(serverPort, () => {
    console.log(`Backend listening on ${serverPort} (${NODE_ENV})`);
  });
}

module.exports = app;
