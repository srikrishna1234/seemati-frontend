// backend/src/routes/adminProduct.cjs
// Full replacement — admin product routes (CommonJS)
'use strict';

const express = require('express');
const router = express.Router();
const { createRequire } = require('module');
const requireLocal = createRequire(__filename);
const path = require('path');

// Helper: safe-load Product model (try multiple fallbacks)
let Product = null;
(function tryLoadProduct() {
  const candidates = [
    path.join(__dirname, '..', '..', 'models', 'Product.cjs'),
    path.join(__dirname, '..', '..', 'models', 'Product.js'),
    path.join(__dirname, '..', '..', 'models', 'Product'), // fallback
  ];

  for (const cand of candidates) {
    try {
      const mod = requireLocal(cand);
      Product = mod && (mod.default || mod.Product) ? (mod.default || mod.Product) : mod;
      if (Product) {
        console.log(`[adminProduct] Loaded Product model from ${cand}`);
        break;
      }
    } catch (e) {
      // ignore and try next
    }
  }

  if (!Product) {
    console.warn('[adminProduct] Product model not found — routes will return 500 if model is required.');
  }
})();

// Admin auth helper — supports ADMIN_TOKEN env or Bearer token
function isAdminAuthorized(req) {
  const auth = (req.headers && req.headers.authorization) || '';
  const token = String(auth).replace(/^Bearer\s+/i, '').trim();
  const ADMIN_TOKEN = process.env.ADMIN_TOKEN || process.env.REACT_APP_ADMIN_TOKEN || null;
  if (!ADMIN_TOKEN) {
    // If no admin token configured, allow by default (dev mode)
    return true;
  }
  if (!token) return false;
  return token === ADMIN_TOKEN;
}

// Simple error wrapper
function handleErr(res, err, status = 500) {
  console.error('[adminProduct] error:', err && (err.stack || err));
  return res.status(status).json({ ok: false, error: err && err.message ? err.message : 'server error' });
}

// Middleware: require admin auth
router.use((req, res, next) => {
  if (!isAdminAuthorized(req)) {
    return res.status(401).json({ ok: false, message: 'Unauthorized' });
  }
  next();
});

// GET /admin-api/products
// Query params: page, limit, q (search), fields (comma separated)
router.get('/products', async (req, res) => {
  try {
    if (!Product) return res.status(500).json({ ok: false, message: 'Product model not available' });

    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '50', 10)));
    const skip = (page - 1) * limit;

    const q = (req.query.q || '').trim();
    const fieldsRaw = (req.query.fields || '').trim();
    let projection = null;
    if (fieldsRaw) {
      projection = {};
      fieldsRaw.split(',').map(s => s.trim()).filter(Boolean).forEach(f => { projection[f] = 1; });
    }

    const filter = {};
    if (q) {
      // basic text search on title, description, sku
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { sku: { $regex: q, $options: 'i' } },
      ];
    }

    const total = await Product.countDocuments(filter).exec();
    const docs = await Product.find(filter, projection).skip(skip).limit(limit).lean().exec();

    return res.json({ ok: true, page, limit, total, data: docs });
  } catch (err) {
    return handleErr(res, err);
  }
});

// POST /admin-api/products
// Create product (expects JSON body)
router.post('/products', async (req, res) => {
  try {
    if (!Product) return res.status(500).json({ ok: false, message: 'Product model not available' });

    const body = req.body || {};
    // minimal validation
    if (!body.title || !body.price) {
      return res.status(400).json({ ok: false, message: 'Missing required fields: title, price' });
    }

    const created = await Product.create(body);
    return res.status(201).json({ ok: true, data: created });
  } catch (err) {
    return handleErr(res, err);
  }
});

// GET /admin-api/products/:id
router.get('/products/:id', async (req, res) => {
  try {
    if (!Product) return res.status(500).json({ ok: false, message: 'Product model not available' });

    const id = req.params.id;
    const doc = await Product.findById(id).lean().exec();
    if (!doc) return res.status(404).json({ ok: false, message: 'Not found' });
    return res.json({ ok: true, data: doc });
  } catch (err) {
    return handleErr(res, err);
  }
});

// PUT /admin-api/products/:id
router.put('/products/:id', async (req, res) => {
  try {
    if (!Product) return res.status(500).json({ ok: false, message: 'Product model not available' });

    const id = req.params.id;
    const update = req.body || {};
    const updated = await Product.findByIdAndUpdate(id, update, { new: true }).lean().exec();
    if (!updated) return res.status(404).json({ ok: false, message: 'Not found' });
    return res.json({ ok: true, data: updated });
  } catch (err) {
    return handleErr(res, err);
  }
});

// DELETE /admin-api/products/:id
router.delete('/products/:id', async (req, res) => {
  try {
    if (!Product) return res.status(500).json({ ok: false, message: 'Product model not available' });

    const id = req.params.id;
    const removed = await Product.findByIdAndDelete(id).lean().exec();
    if (!removed) return res.status(404).json({ ok: false, message: 'Not found' });
    return res.json({ ok: true, data: removed });
  } catch (err) {
    return handleErr(res, err);
  }
});

module.exports = router;
