// backend/src/routes/adminProduct.cjs
'use strict';

const express = require('express');
const router = express.Router();
const { createRequire } = require('module');
const requireLocal = createRequire(__filename);
const path = require('path');

// Try to load Product model safely
let Product = null;
(function tryLoadProduct() {
  const candidates = [
    path.join(__dirname, '..', '..', 'models', 'Product.cjs'),
    path.join(__dirname, '..', '..', 'models', 'Product.js'),
    path.join(__dirname, '..', '..', 'models', 'Product'),
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
      // ignore
    }
  }
  if (!Product) console.warn('[adminProduct] Product model not found — admin endpoints will return 500 if model required.');
})();

function isAdminAuthorized(req) {
  const auth = (req.headers && req.headers.authorization) || '';
  const token = String(auth).replace(/^Bearer\s+/i, '').trim();
  const ADMIN_TOKEN = process.env.ADMIN_TOKEN || process.env.REACT_APP_ADMIN_TOKEN || null;
  if (!ADMIN_TOKEN) return true;
  if (!token) return false;
  return token === ADMIN_TOKEN;
}

function handleErr(res, err, status = 500) {
  console.error('[adminProduct] error:', err && (err.stack || err));
  return res.status(status).json({ ok: false, error: err && err.message ? err.message : 'server error' });
}

router.use((req, res, next) => {
  if (!isAdminAuthorized(req)) return res.status(401).json({ ok: false, message: 'Unauthorized' });
  next();
});

router.get('/products', async (req, res) => {
  try {
    if (!Product) return res.status(500).json({ ok: false, message: 'Product model not available' });
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '50', 10)));
    const skip = (page - 1) * limit;
    const q = (req.query.q || '').trim();
    const projection = req.query.fields ? Object.fromEntries(req.query.fields.split(',').map(f => [f.trim(), 1])) : null;
    const filter = {};
    if (q) filter.$or = [{ title: { $regex: q, $options: 'i' } }, { description: { $regex: q, $options: 'i' } }, { sku: { $regex: q, $options: 'i' } }];
    const total = await Product.countDocuments(filter).exec();
    const docs = await Product.find(filter, projection).skip(skip).limit(limit).lean().exec();
    return res.json({ ok: true, page, limit, total, data: docs });
  } catch (err) {
    return handleErr(res, err);
  }
});

router.post('/products', async (req, res) => {
  try {
    if (!Product) return res.status(500).json({ ok: false, message: 'Product model not available' });
    const body = req.body || {};
    if (!body.title || body.price == null) return res.status(400).json({ ok: false, message: 'Missing required fields: title, price' });
    const created = await Product.create(body);
    return res.status(201).json({ ok: true, data: created });
  } catch (err) {
    return handleErr(res, err);
  }
});

router.get('/products/:id', async (req, res) => {
  try {
    if (!Product) return res.status(500).json({ ok: false, message: 'Product model not available' });
    const doc = await Product.findById(req.params.id).lean().exec();
    if (!doc) return res.status(404).json({ ok: false, message: 'Not found' });
    return res.json({ ok: true, data: doc });
  } catch (err) {
    return handleErr(res, err);
  }
});

router.put('/products/:id', async (req, res) => {
  try {
    if (!Product) return res.status(500).json({ ok: false, message: 'Product model not available' });
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body || {}, { new: true }).lean().exec();
    if (!updated) return res.status(404).json({ ok: false, message: 'Not found' });
    return res.json({ ok: true, data: updated });
  } catch (err) {
    return handleErr(res, err);
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    if (!Product) return res.status(500).json({ ok: false, message: 'Product model not available' });
    const removed = await Product.findByIdAndDelete(req.params.id).lean().exec();
    if (!removed) return res.status(404).json({ ok: false, message: 'Not found' });
    return res.json({ ok: true, data: removed });
  } catch (err) {
    return handleErr(res, err);
  }
});

module.exports = router;
