// backend/src/routes/adminProduct.cjs
'use strict';

const express = require('express');
const router = express.Router();
const mongoose = (() => { try { return require('mongoose'); } catch (e) { return null; } })();

// Defensive require for Product model (tries common filenames)
let Product;
const tryPaths = [
  '../models/productModel.cjs',
  '../models/productModel.js',
  '../models/Product.cjs',
  '../models/Product.js',
  '../models/products.js'
];
for (const p of tryPaths) {
  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    Product = require(p);
    if (Product) break;
  } catch (e) { /* ignore */ }
}

// admin auth helper — uses ADMIN_TOKEN env set in app.cjs
function isAdminAuthorized(req) {
  const ADMIN_TOKEN = process.env.ADMIN_TOKEN || null;
  const auth = req.headers.authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!ADMIN_TOKEN) return true; // allow if no token configured
  if (!token) return false;
  return token === ADMIN_TOKEN;
}

// wrapper to catch async errors
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// GET /admin-api/products  (list)
router.get('/products', wrap(async (req, res) => {
  if (!Product) return res.status(500).json({ error: 'Product model not found on server' });

  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.max(1, Math.min(200, parseInt(req.query.limit || '50', 10)));
  const skip = (page - 1) * limit;

  const fields = req.query.fields ? req.query.fields.split(',').map(f => f.trim()).join(' ') : '';

  const query = {}; // extendable: add filters
  const docs = await Product.find(query).select(fields || '').skip(skip).limit(limit).lean().exec();
  return res.json(docs);
}));

// GET /admin-api/products/:id  (single)
router.get('/products/:id', wrap(async (req, res) => {
  if (!Product) return res.status(500).json({ error: 'Product model not found on server' });
  const id = req.params.id;

  if (mongoose && mongoose.Types && mongoose.Types.ObjectId && !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'invalid id' });
  }

  const doc = await Product.findById(id).lean().exec();
  if (!doc) return res.status(404).json({ error: 'product not found' });
  return res.json(doc);
}));

// POST /admin-api/products  (create)
router.post('/products', wrap(async (req, res) => {
  if (!isAdminAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (!Product) return res.status(500).json({ error: 'Product model not found on server' });

  const payload = req.body || {};
  // Basic safety: require a title and price (adjust per your model)
  if (!payload.title) return res.status(400).json({ error: 'title is required' });
  if (typeof payload.price === 'undefined') return res.status(400).json({ error: 'price is required' });

  const created = await Product.create(payload);
  return res.status(201).json(created);
}));

// PUT /admin-api/products/:id  (replace/update whole doc)
router.put('/products/:id', wrap(async (req, res) => {
  if (!isAdminAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (!Product) return res.status(500).json({ error: 'Product model not found on server' });

  const id = req.params.id;
  if (mongoose && mongoose.Types && mongoose.Types.ObjectId && !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'invalid id' });
  }

  const payload = req.body || {};
  // If you require fields, validate here. We'll attempt to update/replace.
  const updated = await Product.findByIdAndUpdate(id, payload, { new: true, runValidators: true }).lean().exec();
  if (!updated) return res.status(404).json({ error: 'product not found' });
  return res.json(updated);
}));

// PATCH /admin-api/products/:id  (partial update)
router.patch('/products/:id', wrap(async (req, res) => {
  if (!isAdminAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (!Product) return res.status(500).json({ error: 'Product model not found on server' });

  const id = req.params.id;
  if (mongoose && mongoose.Types && mongoose.Types.ObjectId && !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'invalid id' });
  }

  const payload = req.body || {};
  // Allow partial update: direct document fields or Mongo-update operators (like $push) if your model accepts them.
  // We'll prefer a direct update using findByIdAndUpdate with the payload as-is.
  const updated = await Product.findByIdAndUpdate(id, payload, { new: true, runValidators: true }).lean().exec();
  if (!updated) return res.status(404).json({ error: 'product not found' });
  return res.json(updated);
}));

// DELETE /admin-api/products/:id
router.delete('/products/:id', wrap(async (req, res) => {
  if (!isAdminAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (!Product) return res.status(500).json({ error: 'Product model not found on server' });

  const id = req.params.id;
  if (mongoose && mongoose.Types && mongoose.Types.ObjectId && !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'invalid id' });
  }

  const removed = await Product.findByIdAndDelete(id).lean().exec();
  if (!removed) return res.status(404).json({ error: 'product not found' });
  return res.json({ ok: true, removedId: id });
}));

// fallback: helpful message
router.all('*', (req, res) => {
  res.status(404).json({ error: `adminProduct route: ${req.method} ${req.originalUrl} not found` });
});

module.exports = router;
