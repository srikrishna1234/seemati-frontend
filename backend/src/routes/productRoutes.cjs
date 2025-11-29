// backend/src/routes/productRoutes.cjs
// Product routes with image normalization + CREATE + DELETE handler + slug auto-generation
const express = require('express');
const path = require('path');
const fs = require('fs');
const Product = require('../models/product.cjs');
const router = express.Router();

// simple slugify
function slugify(text = '') {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[\s\_]+/g, '-')         // spaces/underscores -> dash
    .replace(/[^\w\-]+/g, '')         // remove non-word chars (keep dash)
    .replace(/\-\-+/g, '-')           // collapse dashes
    .replace(/^-+|-+$/g, '');         // trim dashes
}

// Normalizer converts stored string entry -> { url, key }
function normalizeImageEntryForResponse(entry) {
  if (!entry) return null;
  if (typeof entry === 'object' && entry.url) return entry;
  if (typeof entry === 'string' && (entry.startsWith('http://') || entry.startsWith('https://'))) {
    return { url: entry, key: entry.split('.amazonaws.com/')[1] || entry };
  }
  if (typeof entry === 'string') {
    const clean = entry.startsWith('/') ? entry : `/${entry}`;
    return { url: clean, key: clean };
  }
  return null;
}

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
  p.images = p.images.map(normalizeImageEntryForResponse).filter(Boolean);
  return p;
}

// CREATE product (POST /api/products)
router.post('/', async (req, res) => {
  try {
    const payload = { ...req.body };

    // if slug missing but title provided, auto-generate slug
    if (!payload.slug && payload.title) {
      payload.slug = slugify(payload.title);
    }

    // Normalize any incoming images before saving
    if (payload.images && Array.isArray(payload.images)) {
      payload.images = prepareImagesForDb(payload.images);
    }

    const created = await Product.create(payload);
    const normalized = normalizeProductForResponse(created);
    return res.status(201).json({ success: true, product: normalized });
  } catch (err) {
    console.error('[productRoutes] create error:', err && err.stack ? err.stack : err);
    // Mongoose validation errors may include useful messages
    return res.status(500).json({ success: false, message: err && err.message ? err.message : 'Create failed' });
  }
});

// GET list
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({});
    const normalized = products.map(p => normalizeProductForResponse(p));
    return res.json({ success: true, products: normalized });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET single
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

// UPDATE product
router.put('/:id', async (req, res) => {
  try {
    const update = { ...req.body };
    if (update.images && Array.isArray(update.images)) {
      update.images = prepareImagesForDb(update.images);
    }
    // if updating title and slug not provided, regenerate slug
    if (update.title && !update.slug) {
      update.slug = slugify(update.title);
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

// DELETE product
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ success: false, message: 'Not found' });

    // optional local file cleanup
    try {
      if (Array.isArray(product.images)) {
        product.images.forEach(entry => {
          if (!entry) return;
          const imgPath = (typeof entry === 'object' && entry.url) ? entry.url : (typeof entry === 'string' ? entry : null);
          if (!imgPath) return;
          if (imgPath.startsWith('/uploads') || imgPath.startsWith('uploads')) {
            const relative = imgPath.startsWith('/') ? imgPath.slice(1) : imgPath;
            const absolute = path.join(__dirname, '..', '..', relative);
            fs.unlink(absolute, err => {
              if (err && err.code !== 'ENOENT') console.warn('Failed to remove local image file:', absolute, String(err));
            });
          }
        });
      }
    } catch (cleanupErr) {
      console.warn('Image cleanup step failed (non-fatal):', String(cleanupErr));
    }

    await Product.findByIdAndDelete(id);
    return res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    console.error('[productRoutes] delete error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
