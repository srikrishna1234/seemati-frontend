/*
  backend/src/routes/adminProduct.cjs
  Admin-facing product routes (CommonJS)
  - Provides CRUD for products: list, create, update, delete
  - Uses productController if present
  - Optional admin authentication middleware if present (exports.adminAuth)
  - Handles file upload via a simple multer setup if upload route not centralised
*/
'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');

// Load controller if available
let productController = null;
try {
  productController = require('../controllers/productController');
} catch (e) {
  // keep null; routes will return 500 if controller missing
  console.warn('[adminProduct] productController not found:', e && e.message ? e.message : e);
}

// Optional admin auth middleware (if project provides it)
let adminAuth = null;
try {
  adminAuth = require('../middleware/adminAuth'); // if exists, use it
} catch (e) {
  // no admin auth available — routes remain unprotected
}

// Simple multer setup for file uploads (only used if upload route needed here)
let upload;
try {
  const multer = require('multer');
  const os = require('os');
  const uploadDir = path.join(os.tmpdir(), 'seemati-uploads');
  const fs = require('fs');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const safe = Date.now() + '-' + file.originalname.replace(/\s+/g, '-');
      cb(null, safe);
    }
  });
  upload = multer({ storage });
} catch (e) {
  upload = null;
}

// Helpers
function ensureController(res) {
  return res.status(500).json({ error: 'productController not available on server' });
}

// Routes

// GET /admin/products - list (supports query params)
router.get('/', adminAuth ? adminAuth : (req, res, next) => next(), async (req, res) => {
  if (!productController || !productController.listAdmin) return ensureController(res);
  try {
    const data = await productController.listAdmin(req.query);
    res.json(data);
  } catch (err) {
    console.error('[adminProduct] list error', err && err.stack ? err.stack : err);
    res.status(500).json({ error: 'failed to list products' });
  }
});

// POST /admin/products - create (multipart/form-data if files)
router.post('/', adminAuth ? adminAuth : (req, res, next) => next(), upload ? upload.any() : (req, res, next) => next(), async (req, res) => {
  if (!productController || !productController.create) return ensureController(res);
  try {
    // controller decides how to read files (req.files) and body
    const created = await productController.create(req.body, req.files);
    res.status(201).json(created);
  } catch (err) {
    console.error('[adminProduct] create error', err && err.stack ? err.stack : err);
    res.status(500).json({ error: 'failed to create product' });
  }
});

// GET /admin/products/:id - get single
router.get('/:id', adminAuth ? adminAuth : (req, res, next) => next(), async (req, res) => {
  if (!productController || !productController.getById) return ensureController(res);
  try {
    const doc = await productController.getById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'product not found' });
    res.json(doc);
  } catch (err) {
    console.error('[adminProduct] getById error', err && err.stack ? err.stack : err);
    res.status(500).json({ error: 'failed to get product' });
  }
});

// PUT /admin/products/:id - update
router.put('/:id', adminAuth ? adminAuth : (req, res, next) => next(), upload ? upload.any() : (req, res, next) => next(), async (req, res) => {
  if (!productController || !productController.update) return ensureController(res);
  try {
    const updated = await productController.update(req.params.id, req.body, req.files);
    res.json(updated);
  } catch (err) {
    console.error('[adminProduct] update error', err && err.stack ? err.stack : err);
    res.status(500).json({ error: 'failed to update product' });
  }
});

// DELETE /admin/products/:id - delete
router.delete('/:id', adminAuth ? adminAuth : (req, res, next) => next(), async (req, res) => {
  if (!productController || !productController.remove) return ensureController(res);
  try {
    await productController.remove(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('[adminProduct] delete error', err && err.stack ? err.stack : err);
    res.status(500).json({ error: 'failed to delete product' });
  }
});

module.exports = router;
