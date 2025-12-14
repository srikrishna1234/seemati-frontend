// backend/src/controllers/productController.cjs
'use strict';

const path = require('path');
let Product;

try {
  Product = require(path.join(__dirname, '..', '..', 'models', 'Product.cjs'));
  console.log('[productController] Loaded model');
} catch (err) {
  console.error('[productController] FAILED to load Product model:', err && err.message);
  const e = new Error('Product model not found');
  module.exports = {
    getAllProducts: async (_req, res) => res.status(500).json({ error: e.message }),
    getProductById: async (_req, res) => res.status(500).json({ error: e.message }),
    createProduct: async (_req, res) => res.status(500).json({ error: e.message }),
    updateProduct: async (_req, res) => res.status(500).json({ error: e.message }),
    deleteProduct: async (_req, res) => res.status(500).json({ error: e.message }),
    listProducts: async (_req, res) => res.status(500).json({ error: e.message }),
    getProduct: async (_req, res) => res.status(500).json({ error: e.message }),
  };
  return;
}

/* ---------- GET ALL ---------- */
async function getAllProducts(req, res) {
  try {
    const products = await Product.find().lean();
    return res.json(products);
  } catch (err) {
    console.error('[productController] getAllProducts error:', err);
    return res.status(500).json({ error: 'Failed to fetch products' });
  }
}

/* ---------- GET BY ID ---------- */
async function getProductById(req, res) {
  try {
    const { id } = req.params;
    const product = await Product.findById(id).lean();
    if (!product) return res.status(404).json({ error: 'Product not found' });
    return res.json(product);
  } catch (err) {
    console.error('[productController] getProductById error:', err);
    return res.status(500).json({ error: 'Failed to fetch product' });
  }
}

/* ---------- CREATE ---------- */
async function createProduct(req, res) {
  try {
    const p = new Product(req.body);
    await p.save();
    return res.status(201).json(p);
  } catch (err) {
    console.error('[productController] createProduct error:', err);
    return res.status(500).json({ error: 'Failed to create product' });
  }
}

/* ---------- UPDATE (FINAL FIX) ---------- */
async function updateProduct(req, res) {
  console.log('🔵 UPDATE PRODUCT HIT');
  console.log('🔵 req.body =', JSON.stringify(req.body, null, 2));

  try {
    const { id } = req.params;

    const updated = await Product.findByIdAndUpdate(
      id,
      { $set: req.body },           // 🔥 FULL OVERWRITE — REQUIRED
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ error: 'Product not found' });
    }

    return res.json(updated);
  } catch (err) {
    console.error('[productController] updateProduct error:', err);
    return res.status(500).json({ error: 'Failed to update product' });
  }
}

/* ---------- DELETE ---------- */
async function deleteProduct(req, res) {
  try {
    const { id } = req.params;
    const deleted = await Product.findByIdAndDelete(id).lean();
    if (!deleted) return res.status(404).json({ error: 'Product not found' });
    return res.json({ success: true });
  } catch (err) {
    console.error('[productController] deleteProduct error:', err);
    return res.status(500).json({ error: 'Failed to delete product' });
  }
}

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  listProducts: getAllProducts,
  getProduct: getProductById
};
