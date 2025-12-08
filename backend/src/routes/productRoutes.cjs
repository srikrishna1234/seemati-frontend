// backend/src/routes/productRoutes.cjs
const express = require('express');
const router = express.Router();

// Explicit requires
const Product = require('../models/Product.cjs');
const generateUniqueSlug = require('../utils/generateUniqueSlug.js');
const slugify = require('../utils/slugify.js');

// If your DB has no collation index, keep null
const COLLATION = null;

// Random suffix for slug conflicts
function randomSuffix(len = 4) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < len; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

/* -------------------------------------------------------
   CREATE PRODUCT
   POST /api/products
-------------------------------------------------------- */
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const { title, slug: incomingSlug, ...rest } = body;

    let baseForSlug = slugify(incomingSlug || title || rest.name || 'product');

    // Generate unique slug
    let slug = await generateUniqueSlug(Product, baseForSlug, { collation: COLLATION });

    let attempts = 0;
    const maxAttempts = 4;

    while (attempts < maxAttempts) {
      try {
        const product = new Product({ ...rest, title, slug });
        await product.save();
        return res.status(201).json({ success: true, product });
      } catch (err) {
        // Slug conflict -> retry with random suffix
        if (err && err.code === 11000 && err.keyPattern && err.keyPattern.slug) {
          attempts++;
          if (attempts >= maxAttempts) {
            return res.status(409).json({
              success: false,
              message: 'Slug conflict — please try a different title or slug'
            });
          }
          slug = `${baseForSlug}-${randomSuffix(4)}`;
          continue;
        }

        console.error('Product save error:', err);
        return res.status(500).json({
          success: false,
          message: err.message || 'Server error'
        });
      }
    }

    return res.status(409).json({
      success: false,
      message: 'Could not create product due to slug conflict'
    });

  } catch (err) {
    console.error('Product create unexpected error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Server error'
    });
  }
});

/* -------------------------------------------------------
   GET PRODUCT BY SLUG
   GET /api/products/:slug
-------------------------------------------------------- */
router.get('/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;

    if (!slug) {
      return res.status(400).json({
        success: false,
        message: 'Missing slug'
      });
    }

    const product = await Product.findOne({ slug }).lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    return res.json({ success: true, product });

  } catch (err) {
    console.error('Get product error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Server error'
    });
  }
});

/* -------------------------------------------------------
   GET ALL PRODUCTS
   GET /api/products
-------------------------------------------------------- */
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().lean().limit(200);
    res.json({ success: true, products });
  } catch (err) {
    console.error('List products error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Server error'
    });
  }
});

/* -------------------------------------------------------
   UPDATE PRODUCT BY ID
   PUT /api/products/:id
   (THIS WAS MISSING — NOW ADDED)
-------------------------------------------------------- */
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Missing product ID'
      });
    }

    const updateBody = { ...req.body };

    const updated = await Product.findByIdAndUpdate(
      id,
      updateBody,
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    return res.json({ success: true, product: updated });

  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Server error'
    });
  }
});

module.exports = router;
