'use strict';

/*
  backend/src/server.js
  - Create and export the Express app instance (CommonJS).
  - Mounts product/admin/upload routes (expects .cjs route modules).
  - Keeps configuration minimal and compatible with existing layout.
*/

const express = require('express');
const cors = require('cors');
const path = require('path');

// Attempt to require morgan if available (non-fatal)
let morgan;
try { morgan = require('morgan'); } catch (e) { morgan = null; }

// route modules (attempt both .cjs and no-ext fallbacks)
function tryRequire(p) {
  try { return require(p); } catch (e) {
    try { return require(p.replace(/\.cjs$/, '')); } catch (_) { return null; }
  }
}

const productRoutes = tryRequire('./routes/productRoutes.cjs') || tryRequire('./routes/productRoutes');
const adminProductRoutes = tryRequire('./routes/adminProduct.cjs') || tryRequire('./routes/adminProduct');
const uploadRoutes = tryRequire('./routes/upload.cjs') || tryRequire('./routes/upload');

const app = express();

// Basic middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (morgan) {
  app.use(morgan('dev'));
}

// Mount product routes at /products (public)
if (productRoutes) {
  app.use('/products', productRoutes);
}

// Mount admin product routes at /admin/products
if (adminProductRoutes) {
  app.use('/admin/products', adminProductRoutes);
}

// Mount upload routes at /upload (if centralised)
if (uploadRoutes) {
  app.use('/upload', uploadRoutes);
}

// Static and health endpoints
app.use('/public', express.static(path.join(__dirname, '..', 'public')));
app.get('/_health', (req, res) => res.json({ ok: true }));

module.exports = app;
