// backend/src/server.js
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

const PORT = process.env.PORT || 4000;

function canonicalizeOrigin(raw) {
  if (!raw) return raw;
  try { const u = new URL(String(raw).trim()); return u.origin; }
  catch { return String(raw).trim().replace(/\/+$/, '').toLowerCase(); }
}

async function connectMongo() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || null;
  if (!mongoose) return;
  if (!uri) {
    console.warn('[server] No MongoDB URI found');
    return;
  }
  try {
    await mongoose.connect(uri);
    console.log(' MongoDB connected');
  } catch (e) {
    console.error('[server] Mongo DB connect failed:', e);
  }
}

// Dynamic require helper
async function tryRequire(relPath) {
  try {
    let resolved;
    try { resolved = requireLocal.resolve(relPath); }
    catch { return null; }

    try { return requireLocal(resolved); }
    catch {}

    try {
      const fileUrl = pathToFileURL(resolved).href;
      const imported = await import(fileUrl);
      return imported.default || imported;
    } catch { return null; }

  } catch {
    return null;
  }
}

async function main() {
  await connectMongo();

  const app = express();

  // CORS allowed origins
  const FR = canonicalizeOrigin(process.env.FRONTEND_ORIGIN || 'http://localhost:3000');
  const allowed = new Set([FR]);
  allowed.add('http://localhost:3000');
  allowed.add('http://127.0.0.1:3000');

  app.use(cors({
    origin: (incoming, cb) => {
      if (!incoming) return cb(null, true);
      const norm = canonicalizeOrigin(incoming);
      if (allowed.has(norm)) return cb(null, true);
      console.warn('[CORS] blocked:', incoming);
      return cb(new Error(`CORS: ${incoming} not allowed`));
    },
    credentials: true
  }));

  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // Sessions
  app.use(session({
    secret: process.env.SESSION_SECRET || 'dev_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
  }));

  // uploads folder
  const uploadDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  app.use('/uploads', express.static(uploadDir));

  // MOUNT ROUTES ----------------------

  // Upload routes (your missing part)
  const uploadRoutes =
    await tryRequire('./routes/uploadRoutes.cjs') ||
    await tryRequire('./routes/uploadRoutes.js');

  if (uploadRoutes) {
    app.use('/api/uploads', uploadRoutes);
    console.log(' Mounted uploadRoutes.cjs at /api/uploads');
  }

  // Presign PUT route
  const presign =
    await tryRequire('./routes/presign-put.cjs') ||
    await tryRequire('./routes/presign-put.js');

  if (presign) {
    app.use('/api/presign-put', presign);
    console.log(' Mounted presign-put at /api/presign-put');
  }

  // Product routes
  const productRoutes =
    await tryRequire('./routes/productRoutes.cjs') ||
    await tryRequire('./routes/productRoutes.js');

  if (productRoutes) {
    app.use('/api/products', productRoutes);
    console.log(' Mounted productRoutes at /api/products');
  }

  // Admin product routes if exist
  const adminRoutes =
    await tryRequire('./routes/adminProduct.cjs') ||
    await tryRequire('./routes/adminProduct.js');

  if (adminRoutes) {
    app.use('/api/admin/products', adminRoutes);
    console.log(' Mounted adminProduct at /api/admin/products');
  }

  // Health endpoints
  app.get('/api/ping', (req, res) => res.json({ ok: true }));
  app.get('/health', (req, res) => res.json({ ok: true }));

  // API fallback
  app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found' }));

  // Start server
  app.listen(PORT, () => {
    console.log(` Backend running on port ${PORT}`);
  });
}

main();
