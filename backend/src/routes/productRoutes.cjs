// backend/src/routes/productRoutes.cjs
// FULL REPLACEMENT — adds automatic image normalization on every product fetch

const express = require('express');
const Product = require('../models/product.cjs');
const router = express.Router();

// Normalizer converts any string image → { url, key }
function normalizeImageEntry(entry) {
  if (!entry) return null;

  // Case 1: Already proper
  if (typeof entry === 'object' && entry.url) return entry;

  // Case 2: String URL (http or https)
  if (typeof entry === 'string' && (entry.startsWith('http://') || entry.startsWith('https://'))) {
    return {
      url: entry,
      key: entry.split('.amazonaws.com/')[1] || entry
    };
  }

  // Case 3: Local uploads path: "/uploads/xyz.png"
  if (typeof entry === 'string') {
    let clean = entry.startsWith('/') ? entry : `/${entry}`;
    return {
      url: clean,
      key: clean
    };
  }

  // Fallback
  return null;
}

// Normalize full product object
function normalizeProduct(product) {
  if (!product || !product.images) return product;

  product.images = product.images
    .map(normalizeImageEntry)
    .filter(Boolean);

  return product;
}

// ------------------------
// GET ALL PRODUCTS
// ------------------------
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({});
    const normalized = products.map(p => normalizeProduct(p.toObject()));

    return res.json({
      success: true,
      products: normalized
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ------------------------
// GET SINGLE PRODUCT
// ------------------------
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) return res.status(404).json({ success:false, message:"Not found" });

    const normalized = normalizeProduct(product.toObject());

    return res.json({
      success: true,
      product: normalized
    });
  } catch (err) {
    return res.status(500).json({ success:false, message: err.message });
  }
});

// ------------------------
// UPDATE PRODUCT
// ------------------------
router.put('/:id', async (req, res) => {
  try {
    const update = req.body;

    // ALSO normalize update.images if frontend sends raw strings
    if (update.images && Array.isArray(update.images)) {
      update.images = update.images.map(normalizeImageEntry).filter(Boolean);
    }

    const updated = await Product.findByIdAndUpdate(req.params.id, update, {
      new: true
    });

    const normalized = normalizeProduct(updated.toObject());

    return res.json({
      success: true,
      product: normalized
    });
  } catch (err) {
    return res.status(500).json({ success:false, message: err.message });
  }
});

module.exports = router;
