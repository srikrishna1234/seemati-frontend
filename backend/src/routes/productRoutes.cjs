// backend/src/routes/productRoutes.cjs
// Replacement to avoid CastError: accepts incoming images as objects or strings,
// stores strings (old schema), while returning normalized objects to frontend.

const express = require('express');
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

  // Case 3: Local path string ("/uploads/...")
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
        // Prefer url field, then key, then JSON fallback
        if (img.url && typeof img.url === 'string') return img.url;
        if (img.key && typeof img.key === 'string') return img.key;
        // last resort: attempt string coercion
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

// GET /api/products  (simple)
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({});
    const normalized = products.map(p => normalizeProductForResponse(p));
    return res.json({ success: true, products: normalized });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET single product
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

// UPDATE product (PUT /api/products/:id)
router.put('/:id', async (req, res) => {
  try {
    const update = { ...req.body };

    // If frontend sent images as objects (or mixed), convert them to strings for DB
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

module.exports = router;
