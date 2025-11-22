// backend/src/routes/adminProduct.cjs
// Defensive admin product routes (CommonJS)
// - safe model loading (multiple fallbacks)
// - clear logging for troubleshooting
// - admin auth by ADMIN_TOKEN or JWT (if present)
// - returns helpful errors instead of crashing when model missing
'use strict';

const express = require('express');
const router = express.Router();
const { createRequire } = require('module');
const requireLocal = createRequire(__filename);
const path = require('path');
const fs = require('fs');
const jwt = (() => {
  try { return require('jsonwebtoken'); } catch (e) { return null; }
})();

const LOG_PREFIX = '[adminProduct]';

// --- Safe Product model loader with discovery & logging ---
let Product = null;
function loadProductModel() {
  if (Product) return Product;

  const candidates = [
    path.join(__dirname, '..', '..', 'models', 'Product.cjs'),
    path.join(__dirname, '..', '..', 'models', 'Product.js'),
    path.join(__dirname, '..', '..', 'models', 'Product'),
    // project root fallback
    path.join(process.cwd(), 'backend', 'models', 'Product.cjs'),
  ];

  for (const cand of candidates) {
    try {
      if (!fs.existsSync(cand)) continue;
      const mod = requireLocal(cand);
      Product = mod && (mod.default || mod.Product) ? (mod.default || mod.Product) : mod;
      if (Product) {
        console.log(`${LOG_PREFIX} Loaded Product model from ${cand}`);
        break;
      }
    } catch (err) {
      console.warn(`${LOG_PREFIX} Tried ${cand} but failed to load:`, err && err.message ? err.message : err);
    }
  }

  if (!Product) {
    console.warn(`${LOG_PREFIX} Product model not found. Admin routes will return 500 when model required.`);
  }
  return Product;
}

// --- Admin auth helper (supports ADMIN_TOKEN env or JWT if configured) ---
function isAdminAuthorized(req) {
  try {
    const auth = (req.headers && req.headers.authorization) || '';
    const token = String(auth).replace(/^Bearer\s+/i, '').trim();
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN || process.env.REACT_APP_ADMIN_TOKEN || null;
    if (!ADMIN_TOKEN && !process.env.JWT_SECRET) {
      // no admin protection configured — allow by default (development)
      return true;
    }

    if (ADMIN_TOKEN && token && token === ADMIN_TOKEN) return true;

    if (process.env.JWT_SECRET && token && jwt) {
      try {
        jwt.verify(token, process.env.JWT_SECRET);
        return true;
      } catch (err) {
        return false;
      }
    }

    return false;
  } catch (e) {
    console.error(`${LOG_PREFIX} isAdminAuthorized error:`, e && e.message ? e.message : e);
    return false;
  }
}

// --- Small helper for consistent error responses ---
function handleErr(res, err, status = 500) {
  console.error(`${LOG_PREFIX} error:`, err && (err.stack || err));
  return res.status(status).json({ ok: false, error: err && err.message ? err.message : 'server error' });
}

// --- Middleware: require admin auth for all routes in this router ---
router.use((req, res, next) => {
  if (!isAdminAuthorized(req)) {
    console.warn(`${LOG_PREFIX} Unauthorized request to ${req.method} ${req.originalUrl}`);
    return res.status(401).json({ ok: false, message: 'Unauthorized' });
  }
  next();
});

// --- GET /admin-api/products
router.get('/products', async (req, res) => {
  try {
    const Prod = loadProductModel();
    if (!Prod) return res.status(500).json({ ok: false, message: 'Product model not available' });

    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, Math.min(200, parseInt(req.query.limit || '50', 10)));
    const skip = (page - 1) * limit;

    const q = (req.query.q || '').trim();
    const fieldsRaw = (req.query.fields || '').trim();
    let projection = null;
    if (fieldsRaw) {
      projection = {};
      fieldsRaw.split(',').map(s => s.trim()).filter(Boolean).forEach(f => projection[f] = 1);
    }

    const filter = {};
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { sku: { $regex: q, $options: 'i' } },
      ];
    }

    const total = await Prod.countDocuments(filter).exec();
    const data = await Prod.find(filter, projection).skip(skip).limit(limit).lean().exec();

    return res.json({ ok: true, page, limit, total, data });
  } catch (err) {
    return handleErr(res, err);
  }
});

// --- POST /admin-api/products  (create) ---
router.post('/products', async (req, res) => {
  try {
    const Prod = loadProductModel();
    if (!Prod) return res.status(500).json({ ok: false, message: 'Product model not available' });

    const body = req.body || {};
    if (!body.title || body.price == null) {
      return res.status(400).json({ ok: false, message: 'Missing required fields: title and price' });
    }

    const created = await Prod.create(body);
    console.log(`${LOG_PREFIX} Product created id=${created._id}`);
    return res.status(201).json({ ok: true, data: created });
  } catch (err) {
    return handleErr(res, err);
  }
});

// --- GET /admin-api/products/:id ---
router.get('/products/:id', async (req, res) => {
  try {
    const Prod = loadProductModel();
    if (!Prod) return res.status(500).json({ ok: false, message: 'Product model not available' });

    const id = req.params.id;
    const doc = await Prod.findById(id).lean().exec();
    if (!doc) return res.status(404).json({ ok: false, message: 'Not found' });
    return res.json({ ok: true, data: doc });
  } catch (err) {
    return handleErr(res, err);
  }
});

// --- PUT /admin-api/products/:id ---
router.put('/products/:id', async (req, res) => {
  try {
    const Prod = loadProductModel();
    if (!Prod) return res.status(500).json({ ok: false, message: 'Product model not available' });

    const id = req.params.id;
    const update = req.body || {};
    const updated = await Prod.findByIdAndUpdate(id, update, { new: true }).lean().exec();
    if (!updated) return res.status(404).json({ ok: false, message: 'Not found' });
    console.log(`${LOG_PREFIX} Product updated id=${id}`);
    return res.json({ ok: true, data: updated });
  } catch (err) {
    return handleErr(res, err);
  }
});

// --- DELETE /admin-api/products/:id ---
router.delete('/products/:id', async (req, res) => {
  try {
    const Prod = loadProductModel();
    if (!Prod) return res.status(500).json({ ok: false, message: 'Product model not available' });

    const id = req.params.id;
    const removed = await Prod.findByIdAndDelete(id).lean().exec();
    if (!removed) return res.status(404).json({ ok: false, message: 'Not found' });
    console.log(`${LOG_PREFIX} Product deleted id=${id}`);
    return res.json({ ok: true, data: removed });
  } catch (err) {
    return handleErr(res, err);
  }
});

module.exports = router;
