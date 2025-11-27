// backend/src/routes/productRoutes.cjs
'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// ------------------------------
// ROBUST PRODUCT MODEL IMPORT
// ------------------------------
let Product;
try {
  // Use the capitalized file if present (your repo has Product.cjs), but accept any shape
  const productModule = require('../models/Product.cjs') || require('../models/product.cjs');

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

// ------------------------------
// GET ALL PRODUCTS (with pagination & field selection)
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

    res.json({
      success: true,
      count: products.length,
      page,
      products,
    });
  } catch (err) {
    console.error('GET /api/products error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching products',
      error: err.message,
    });
  }
});

// ------------------------------
// GET ONE PRODUCT BY ID or SLUG
// Accepts either:
//   /api/products/<24-hex-id>  -> findById
//   /api/products/<slug>       -> findOne({ slug })
// ------------------------------
router.get('/:idOrSlug', async (req, res) => {
  try {
    const idOrSlug = req.params.idOrSlug;

    let product = null;

    if (looksLikeObjectId(idOrSlug)) {
      // If it's a valid ObjectId, try findById first
      product = await Product.findById(idOrSlug).lean();
    }

    if (!product) {
      // Fallback: treat as slug (also handles cases where id was passed but not found)
      product = await Product.findOne({ slug: idOrSlug }).lean();
    }

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, product });
  } catch (err) {
    console.error('GET /api/products/:idOrSlug error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching product',
      error: err.message,
    });
  }
});

module.exports = router;
