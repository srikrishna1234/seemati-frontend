// backend/src/routes/productRoutes.cjs
'use strict';

const express = require('express');
const router = express.Router();

// ------------------------------
// ROBUST PRODUCT MODEL IMPORT
// ------------------------------
let Product;
try {
  const productModule = require('../models/product.cjs');

  // Accept any of these shapes:
  Product =
    productModule?.default ||
    productModule?.Product ||
    productModule;

  if (!Product || typeof Product.find !== 'function') {
    console.error("[ProductModel] IMPORT FAILED. module keys:", Object.keys(productModule || {}));
    console.error("[ProductModel] module content:", productModule);
    throw new Error("Product model is not a valid Mongoose model");
  }

  console.log("[ProductModel] Loaded Product model successfully.");
} catch (err) {
  console.error("[ProductModel] ERROR loading model:", err);
  throw err; // stop server if model broken (important)
}

// ------------------------------
// GET ALL PRODUCTS
// ------------------------------
router.get('/', async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    // fields filter
    const fields = req.query.fields
      ? req.query.fields.replace(/,/g, " ")
      : "";

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
    console.error("GET /api/products error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error fetching products",
      error: err.message,
    });
  }
});

// ------------------------------
// GET ONE PRODUCT BY SLUG
// ------------------------------
router.get('/:slug', async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug }).lean();

    if (!product)
      return res.status(404).json({ success: false, message: "Product not found" });

    res.json({ success: true, product });
  } catch (err) {
    console.error("GET /api/products/:slug error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error fetching product",
      error: err.message,
    });
  }
});

module.exports = router;
