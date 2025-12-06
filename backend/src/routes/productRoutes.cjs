// backend/src/routes/productRoutes.cjs
const express = require('express');
const router = express.Router();

// use explicit .cjs filenames to avoid resolution issues
const Product = require('../models/Product.cjs');
const generateUniqueSlug = require('../utils/generateUniqueSlug.js');
const slugify = require('../utils/slugify.js');

// If you created a collation-based index, set COLLATION here; otherwise null
const COLLATION = null;

function randomSuffix(len = 4) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

/**
 * POST /api/products
 */
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const { title, slug: incomingSlug, ...rest } = body;

    let baseForSlug = (incomingSlug || title || rest.name || 'product');
    baseForSlug = slugify(baseForSlug);

    let slug = await generateUniqueSlug(Product, baseForSlug, { collation: COLLATION });

    let attempts = 0;
    const maxAttempts = 4;

    while (attempts < maxAttempts) {
      try {
        const product = new Product({ ...rest, title, slug });
        await product.save();
        return res.status(201).json({ success: true, product });
      } catch (err) {
        if (err && err.code === 11000 && err.keyPattern && err.keyPattern.slug) {
          attempts += 1;
          if (attempts >= maxAttempts) {
            return res.status(409).json({ success: false, message: 'Slug conflict — please try a different title or slug' });
          }
          slug = `${baseForSlug}-${randomSuffix(4)}`;
          continue;
        }
        console.error('Product save error', err);
        return res.status(500).json({ success: false, message: err.message || 'Server error' });
      }
    }

    return res.status(409).json({ success: false, message: 'Could not create product due to slug conflict' });
  } catch (err) {
    console.error('Product create unexpected error', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

/**
 * GET /api/products/:slug
 */
router.get('/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    if (!slug) return res.status(400).json({ success: false, message: 'Missing slug' });
    const product = await Product.findOne({ slug }).lean();
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    return res.json({ success: true, product });
  } catch (err) {
    console.error('Get product error', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

/**
 * GET /api/products
 */
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().lean().limit(200);
    res.json({ success: true, products });
  } catch (err) {
    console.error('List products error', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

module.exports = router;
