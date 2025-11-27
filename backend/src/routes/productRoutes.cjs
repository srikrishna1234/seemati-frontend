// backend/src/routes/productRoutes.cjs
'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// ------------------------------
// ROBUST PRODUCT MODEL IMPORT
// ------------------------------
let Product;
try {
  let productModule;
  try { productModule = require('../models/product.cjs'); } catch (e1) {}
  try { if (!productModule) productModule = require('../models/Product.cjs'); } catch (e2) {}

  Product = productModule?.default || productModule?.Product || productModule;

  if (!Product || typeof Product.find !== 'function') {
    console.error('[ProductModel] IMPORT FAILED. module keys:', Object.keys(productModule || {}));
    console.error('[ProductModel] module content:', productModule);
    throw new Error('Product model is not a valid Mongoose model');
  }

  console.log('[ProductModel] Loaded Product model successfully.');
} catch (err) {
  console.error('[ProductModel] ERROR loading model:', err && err.stack ? err.stack : err);
  throw err;
}

// Helper: is a valid 24-char hex ObjectId
function looksLikeObjectId(str) {
  return typeof str === 'string' && /^[0-9a-fA-F]{24}$/.test(str);
}

// Normalize images payload to array of strings (accept objects with url/path or JSON string)
function normalizeImagesInput(raw) {
  if (typeof raw === 'undefined' || raw === null) return [];

  let arr = raw;

  // If it's a JSON string, try parse
  if (typeof arr === 'string') {
    arr = arr.trim();
    if (arr === '') return [];
    try {
      const parsed = JSON.parse(arr);
      arr = parsed;
    } catch (e) {
      // not JSON; treat as single string url
      return [arr];
    }
  }

  if (!Array.isArray(arr)) {
    // convert non-array to single-element array
    arr = [arr];
  }

  // map each item to a string URL/path
  const out = arr.map((it) => {
    if (typeof it === 'string') return it;
    if (it && typeof it === 'object') {
      // common shapes: { url: '...' } or { path: '...' } or { raw: '...' }
      if (it.url) return it.url;
      if (it.path) return it.path;
      if (it.raw && typeof it.raw === 'string') return it.raw;
      // if nested object, try JSON stringify as fallback (rare)
      try {
        return JSON.stringify(it);
      } catch (e) {
        return String(it);
      }
    }
    return String(it);
  });

  // Filter out empty strings and duplicates
  return out.filter(Boolean);
}

// ------------------------------
// GET ALL PRODUCTS (pagination & fields)
// ------------------------------
router.get('/', async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    const fields = req.query.fields ? req.query.fields.replace(/,/g, ' ') : '';

    const products = await Product.find({})
      .select(fields)
      .skip(skip)
      .limit(limit)
      .lean();

    return res.json({
      success: true,
      count: products.length,
      page,
      products,
    });
  } catch (err) {
    console.error('GET /api/products error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching products', error: err.message });
  }
});

// ------------------------------
// GET ONE PRODUCT BY ID or SLUG
// ------------------------------
router.get('/:idOrSlug', async (req, res) => {
  try {
    const idOrSlug = req.params.idOrSlug;
    let product = null;

    if (looksLikeObjectId(idOrSlug)) {
      product = await Product.findById(idOrSlug).lean();
    }
    if (!product) {
      product = await Product.findOne({ slug: idOrSlug }).lean();
    }

    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    return res.json({ success: true, product });
  } catch (err) {
    console.error('GET /api/products/:idOrSlug error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching product', error: err.message });
  }
});

// ------------------------------
// UPDATE PRODUCT by ID or slug (PUT /api/products/:idOrSlug)
// Accepts JSON payload. Normalizes images.
// ------------------------------
router.put('/:idOrSlug', async (req, res) => {
  try {
    const idOrSlug = req.params.idOrSlug;
    const payload = req.body || {};

    // Normalize images if present
    let normalizedImages;
    if (typeof payload.images !== 'undefined') {
      normalizedImages = normalizeImagesInput(payload.images);
    }

    // Normalize arrays for colors/sizes
    const normalizeArrayField = (val) => {
      if (typeof val === 'undefined' || val === null) return undefined;
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
        // comma separated
        return val.split(',').map(s => s.trim()).filter(Boolean);
      }
      return [val];
    };

    const colors = normalizeArrayField(payload.colors);
    const sizes = normalizeArrayField(payload.sizes);

    // Build update object with allowed fields
    const allowed = ['title','slug','description','price','mrp','compareAtPrice','stock','sku','brand','category','sizes','colors','thumbnail','videoUrl','isPublished','published'];
    const update = {};
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(payload, k)) update[k] = payload[k];
    }

    // Attach normalized arrays if present
    if (Array.isArray(colors)) update.colors = colors;
    if (Array.isArray(sizes)) update.sizes = sizes;
    if (Array.isArray(normalizedImages)) update.images = normalizedImages;

    // Map published to isPublished if needed
    if (typeof payload.published !== 'undefined' && typeof update.isPublished === 'undefined') {
      update.isPublished = payload.published;
    }

    let product = null;
    if (looksLikeObjectId(idOrSlug)) {
      product = await Product.findByIdAndUpdate(idOrSlug, update, { new: true, runValidators: true }).lean();
    }

    if (!product) {
      product = await Product.findOneAndUpdate({ slug: idOrSlug }, update, { new: true, runValidators: true }).lean();
    }

    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    return res.json({ success: true, product });
  } catch (err) {
    console.error('PUT /api/products/:idOrSlug error:', err);
    return res.status(500).json({ success: false, message: 'Server error updating product', error: err.message });
  }
});

// ------------------------------
// SIMPLE UPLOAD STUB: PUT /api/products/:id/upload
// ------------------------------
const multerAvailable = (() => {
  try {
    require.resolve('multer');
    return true;
  } catch (e) {
    return false;
  }
})();

if (multerAvailable) {
  const multer = require('multer');
  const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '';
      const name = `${Date.now()}-${Math.random().toString(36).slice(2,9)}${ext}`;
      cb(null, name);
    }
  });
  const upload = multer({ storage });

  router.put('/:idOrSlug/upload', upload.array('images', 12), async (req, res) => {
    try {
      const keepImages = (() => {
        try { return req.body.keepImages ? JSON.parse(req.body.keepImages) : []; } catch (e) { return []; }
      })();

      const files = Array.isArray(req.files) ? req.files : [];
      const filePaths = files.map(f => `/uploads/${f.filename}`);

      const all = ([]).concat(keepImages || [], filePaths);

      return res.json({ success: true, images: all });
    } catch (err) {
      console.error('PUT upload error:', err);
      return res.status(500).json({ success: false, message: 'Upload failed', error: err.message });
    }
  });
} else {
  router.put('/:idOrSlug/upload', async (req, res) => {
    try {
      const keepImages = req.body?.keepImages ? JSON.parse(req.body.keepImages) : [];
      return res.json({ success: true, images: keepImages || [] });
    } catch (err) {
      console.error('PUT upload (fallback) error:', err);
      return res.status(500).json({ success: false, message: 'Upload stub failed', error: err.message });
    }
  });
}

// ------------------------------
// DELETE product
// ------------------------------
router.delete('/:idOrSlug', async (req, res) => {
  try {
    const idOrSlug = req.params.idOrSlug;
    let product = null;
    if (looksLikeObjectId(idOrSlug)) {
      product = await Product.findByIdAndDelete(idOrSlug).lean();
    }
    if (!product) {
      product = await Product.findOneAndDelete({ slug: idOrSlug }).lean();
    }
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    return res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    console.error('DELETE /api/products/:idOrSlug error:', err);
    return res.status(500).json({ success: false, message: 'Server error deleting product', error: err.message });
  }
});

module.exports = router;
