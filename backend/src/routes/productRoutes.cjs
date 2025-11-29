// backend/src/routes/productRoutes.cjs
// Product routes with image normalization + DELETE handler
const express = require('express');
const path = require('path');
const fs = require('fs');
const Product = require('../models/product.cjs');
const router = express.Router();

// Normalizer converts stored string entry -> { url, key }
function normalizeImageEntryForResponse(entry) {
  if (!entry) return null;

  // Case 1: Already object with url
  if (typeof entry === 'object' && entry.url) return entry;

  // Case 2: Full URL string
  if (typeof entry === 'string' && (entry.startsWith('http://') || entry.startsWith('https://'))) {
    return {
      url: entry,
      key: entry.split('.amazonaws.com/')[1] || entry
    };
  }

  // Case 3: Local path string ("/uploads/..." or "uploads/...")
  if (typeof entry === 'string') {
    const clean = entry.startsWith('/') ? entry : `/${entry}`;
    return {
      url: clean,
      key: clean
    };
  }

  return null;
}

// Convert incoming update.images which may be objects -> array of strings for DB
function prepareImagesForDb(imagesArr) {
  if (!Array.isArray(imagesArr)) return imagesArr;

  return imagesArr
    .map(img => {
      if (!img) return null;
      if (typeof img === 'string') return img;
      if (typeof img === 'object') {
        if (img.url && typeof img.url === 'string') return img.url;
        if (img.key && typeof img.key === 'string') return img.key;
        try { return String(img); } catch (_) { return null; }
      }
      return null;
    })
    .filter(Boolean);
}

function normalizeProductForResponse(product) {
  if (!product) return product;
  const p = product.toObject ? product.toObject() : product;
  if (!p.images) return p;

  p.images = p.images
    .map(normalizeImageEntryForResponse)
    .filter(Boolean);

  return p;
}

// GET /api/products  (list)
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({});
    const normalized = products.map(p => normalizeProductForResponse(p));
    return res.json({ success: true, products: normalized });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/products/:id (single)
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Not found' });
    const normalized = normalizeProductForResponse(product);
    return res.json({ success: true, product: normalized });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/products/:id (update)
router.put('/:id', async (req, res) => {
  try {
    const update = { ...req.body };

    if (update.images && Array.isArray(update.images)) {
      update.images = prepareImagesForDb(update.images);
    }

    const updated = await Product.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ success: false, message: 'Not found' });

    const normalized = normalizeProductForResponse(updated);
    return res.json({ success: true, product: normalized });
  } catch (err) {
    console.error('[productRoutes] update error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/products/:id (delete product)
// - Removes DB doc. Also attempts to remove local uploads (if stored under /uploads).
// - If you use S3, replace local cleanup with S3 delete logic as needed.
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ success: false, message: 'Not found' });

    // Optional: delete local files referenced in product.images when they point to /uploads
    // (Only attempt if path appears local and server has access)
    try {
      if (Array.isArray(product.images)) {
        product.images.forEach(entry => {
          if (!entry) return;
          // extract string path if object
          const imgPath = (typeof entry === 'object' && entry.url) ? entry.url : (typeof entry === 'string' ? entry : null);
          if (!imgPath) return;
          // only attempt when looks like local upload: starts with '/uploads' or 'uploads'
          if (imgPath.startsWith('/uploads') || imgPath.startsWith('uploads')) {
            // convert to absolute path
            const relative = imgPath.startsWith('/') ? imgPath.slice(1) : imgPath;
            const absolute = path.join(__dirname, '..', '..', relative); // adjust if your uploads folder location differs
            fs.unlink(absolute, err => {
              if (err && err.code !== 'ENOENT') console.warn('Failed to remove local image file:', absolute, String(err));
            });
          }
        });
      }
    } catch (cleanupErr) {
      console.warn('Image cleanup step failed (non-fatal):', String(cleanupErr));
    }

    // Remove the product from DB
    await Product.findByIdAndDelete(id);

    return res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    console.error('[productRoutes] delete error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
