'use strict';

/*
  backend/src/server.js
  - Create and export the Express app instance (CommonJS).
  - Mounts product/admin/upload routes (expects .cjs route modules).
  - Keeps configuration minimal and compatible with existing layout.
*/

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

// route modules (assume they exist in routes/)
let productRoutes;
let adminProductRoutes;
let uploadRoutes;
try {
  productRoutes = require('./routes/productRoutes.cjs');
} catch (e) {
  try { productRoutes = require('./routes/productRoutes'); } catch (_) { productRoutes = null; }
}
try {
  adminProductRoutes = require('./routes/adminProduct.cjs');
} catch (e) {
  try { adminProductRoutes = require('./routes/adminProduct'); } catch (_) { adminProductRoutes = null; }
}
try {
  uploadRoutes = require('./routes/upload.cjs');
} catch (e) {
  try { uploadRoutes = require('./routes/upload'); } catch (_) { uploadRoutes = null; }
}

const app = express();

// Basic middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logger (non-blocking; safe if morgan not installed will throw early)
try { app.use(morgan('dev')); } catch (_) {}

// Mount routes if available
if (productRoutes) app.use('/products', productRoutes);
if (adminProductRoutes) app.use('/admin/products', adminProductRoutes);
if (uploadRoutes) app.use('/upload', uploadRoutes);

// Static assets (if any) and health
app.use('/public', express.static(path.join(__dirname, '..', 'public')));
app.get('/_health', (req, res) => res.json({ ok: true }));

module.exports = app;
