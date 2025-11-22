'use strict';

/*
  backend/src/server.js
  - CommonJS Express app factory used by backend/app.cjs (bootstrap).
  - Mounts /products, /admin/products, /upload if those route modules exist.
  - Minimal middleware: CORS, JSON/urlencoded parsers, optional morgan.
*/

const express = require('express');
const cors = require('cors');
const path = require('path');

function tryRequire(file) {
  try { return require(file); } catch (e) {
    try { return require(file.replace(/\.cjs$/, '')); } catch (_) { return null; }
  }
}

const productRoutes = tryRequire('./routes/productRoutes.cjs') || tryRequire('./routes/productRoutes');
const adminProductRoutes = tryRequire('./routes/adminProduct.cjs') || tryRequire('./routes/adminProduct');
const uploadRoutes = tryRequire('./routes/upload.cjs') || tryRequire('./routes/upload');

let morgan;
try { morgan = require('morgan'); } catch (e) { morgan = null; }

const app = express();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (morgan) {
  try { app.use(morgan('dev')); } catch (e) { /* ignore logger errors */ }
}

// Mount routes
if (productRoutes) app.use('/products', productRoutes);
if (adminProductRoutes) app.use('/admin/products', adminProductRoutes);
if (uploadRoutes) app.use('/upload', uploadRoutes);

// Static and health
app.use('/public', express.static(path.join(__dirname, '..', 'public')));
app.get('/_health', (req, res) => res.json({ ok: true }));

module.exports = app;
