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
  // prefer lowercase file (your repo uses product.cjs), but accept either
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

// Helper to normalize images array for responses
function normalizeImages(imgs) {
  if (!imgs) return [];
  if (!Array.isArray(imgs)) return [imgs];
  return imgs;
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
// Accepts JSON payload.
// ------------------------------
router.put('/:idOrSlug', async (req, res) => {
  try {
    const idOrSlug = req.params.idOrSlug;
    const payload = req.body || {};

    // Normalize arrays
    if (payload.colors && !Array.isArray(payload.colors)) {
      payload.colors = Array.isArray(payload.colors) ? payload.colors : String(payload.colors).split(',').map(s => s.trim()).filter(Boolean);
    }
    if (payload.sizes && !Array.isArray(payload.sizes)) {
      payload.sizes = Array.isArray(payload.sizes) ? payload.sizes : String(payload.sizes).split(',').map(s => s.trim()).filter(Boolean);
    }

    // Build update object with only allowed fields
    const allowed = ['title','slug','description','price','mrp','compareAtPrice','stock','sku','brand','category','sizes','colors','thumbnail','images','videoUrl','isPublished','published'];
    const update = {};
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(payload, k)) update[k] = payload[k];
    }

    // Also accept `published` boolean -> map to isPublished for schemas that use that
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
// This is a minimal handler to accept FormData with images and keepImages.
// If you already have a dedicated upload route elsewhere, replace/remove this.
// It will save uploaded files to backend/uploads and return array of image paths.
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
      // safe filename preserving extension
      const ext = path.extname(file.originalname) || '';
      const name = `${Date.now()}-${Math.random().toString(36).slice(2,9)}${ext}`;
      cb(null, name);
    }
  });
  const upload = multer({ storage });

  router.put('/:idOrSlug/upload', upload.array('images', 12), async (req, res) => {
    try {
      // keepImages comes as JSON string
      const keepImages = (() => {
        try {
          return req.body.keepImages ? JSON.parse(req.body.keepImages) : [];
        } catch (e) { return []; }
      })();

      // New files
      const files = Array.isArray(req.files) ? req.files : [];
      const filePaths = files.map(f => `/uploads/${f.filename}`);

      // combine keep + new
      const all = ([]).concat(keepImages || [], filePaths);

      // Respond with images array
      return res.json({ success: true, images: all });
    } catch (err) {
      console.error('PUT upload error:', err);
      return res.status(500).json({ success: false, message: 'Upload failed', error: err.message });
    }
  });
} else {
  // If multer not installed, provide a fallback stub that returns keepImages unchanged
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
// DELETE product (optional)
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
