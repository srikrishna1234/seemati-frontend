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

const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const RAW_FRONTEND =
  process.env.FRONTEND_URL ||
  process.env.FRONTEND_ORIGIN ||
  'http://localhost:3000';

const ALLOW_CREDENTIALS =
  (process.env.CORS_ALLOW_CREDENTIALS || 'true').toLowerCase() === 'true';

// Middleware
app.use(helmet());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

// ---- CORS ----
app.use(
  cors({
    origin: RAW_FRONTEND,
    credentials: true,
  })
);

// Health check
app.get('/_health', (req, res) => res.json({ ok: true }));

// ------------------------
// AUTOMATIC ROUTE MOUNTS
// ------------------------
function mountIfExists(localPath, urlPath) {
  const full = path.join(__dirname, localPath);
  if (fs.existsSync(full)) {
    const router = require(full);
    app.use(urlPath, router);
    console.log(`Mounted ${localPath} at ${urlPath}`);
  } else {
    console.warn(`Skipping ${localPath} - not found`);
  }
}

// MUST mount uploadRoutes.cjs
mountIfExists('routes/uploadRoutes.cjs', '/api/uploads');   // <----- FIXED
mountIfExists('routes/productRoutes.cjs', '/api/products');
mountIfExists('routes/authRoutes.cjs', '/api/auth');

// Serve uploads locally only in dev
if (NODE_ENV !== 'production') {
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (fs.existsSync(uploadsDir)) {
    app.use('/uploads', express.static(uploadsDir));
    console.log('Serving /uploads folder (dev only)');
  }
}

// API 404 fallback
app.use('/api', (req, res) => {
  res.status(404).json({ ok: false, message: 'API endpoint not found' });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () =>
    console.log(`Backend running on port ${PORT}`)
  );
}

module.exports = app;
