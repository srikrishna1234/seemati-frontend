'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// CORS
app.use(cors({
  origin: ['http://localhost:3000'],
  credentials: true
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve uploads
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (fs.existsSync(uploadsDir)) {
  app.use('/uploads', express.static(uploadsDir));
  console.log('[BOOT] Serving /uploads');
}

// Helper loader
function tryRequire(...paths) {
  for (const p of paths) {
    try {
      const full = path.join(__dirname, p);
      if (fs.existsSync(full)) return require(full);
      if (fs.existsSync(full + '.js')) return require(full + '.js');
      if (fs.existsSync(full + '.cjs')) return require(full + '.cjs');
    } catch {}
  }
  return null;
}

// --- FIX: HARD-MOUNT OTP ROUTES ---
const otpRoutes = tryRequire(
  'src/routes/otpRoutes.cjs',
  'routes/otpRoutes.cjs',
  './src/routes/otpRoutes.cjs'
);

if (otpRoutes) {
  app.use('/api/otp', otpRoutes);
  console.log('[BOOT] Mounted OTP routes at /api/otp');
} else {
  console.log('[BOOT] ERROR: otpRoutes not found');
}

// --- Product Routes ---
const productRoutes = tryRequire(
  'src/routes/productRoutes.cjs',
  'routes/productRoutes.cjs'
);
if (productRoutes) {
  app.use('/api/products', productRoutes);
  console.log('[BOOT] Mounted productRoutes at /api/products');
}

// --- Admin product routes ---
const adminRoutes = tryRequire(
  'src/routes/adminProduct.cjs',
  'routes/adminProduct.cjs'
);
if (adminRoutes) {
  app.use('/api/admin/products', adminRoutes);
  console.log('[BOOT] Mounted admin product routes');
}

// Default health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Catch-all for unknown API
app.use('/api', (req, res) =>
  res.status(404).json({ error: 'Unknown API endpoint', path: req.originalUrl })
);

// Mongo + Start server
const MONGO = process.env.MONGO_URI || null;
const PORT = process.env.PORT || 4000;

async function start() {
  if (MONGO) {
    try {
      console.log('[BOOT] Connecting MongoDB...');
      await mongoose.connect(MONGO);
      console.log('[BOOT] MongoDB connected');
    } catch (e) {
      console.log('[BOOT] MongoDB failed:', e.message);
    }
  }

  app.listen(PORT, () => console.log('Backend running on port', PORT));
}

start();

module.exports = app;
