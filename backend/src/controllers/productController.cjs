// backend/src/controllers/productController.cjs
'use strict';

/*
  CommonJS product controller compatible with app.cjs bootstrap.
  - Uses require/module.exports (no 'import' / 'export').
  - Robust to missing model by returning helpful errors.
*/

const path = require('path');

let Product;
try {
  // Adjust path if your Product model is located elsewhere.
  // From backend/src/controllers -> ../../models/Product
  Product = require(path.join(__dirname, '..', '..', 'models', 'Product'));
} catch (err) {
  console.error('[productController] failed to require Product model:', err && err.message);
  // Export a stub that reports error when called so route logs show cause clearly.
  const e = new Error('Product model not found. Check path backend/models/Product.js');
  module.exports = {
    getAllProducts: async (req, res) => res.status(500).json({ error: e.message }),
    getProductById: async (req, res) => res.status(500).json({ error: e.message }),
    createProduct: async (req, res) => res.status(500).json({ error: e.message }),
    updateProduct: async (req, res) => res.status(500).json({ error: e.message }),
    deleteProduct: async (req, res) => res.status(500).json({ error: e.message }),
  };
  return;
}

async function getAllProducts(req, res) {
  try {
    const products = await Product.find().lean();
    return res.json(products);
  } catch (err) {
    console.error('[productController] getAllProducts error:', err);
    return res.status(500).json({ error: 'Failed to fetch products' });
  }
}

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

async function createProduct(req, res) {
  try {
    const payload = req.body;
    const p = new Product(payload);
    await p.save();
    return res.status(201).json(p);
  } catch (err) {
    console.error('[productController] createProduct error:', err);
    return res.status(500).json({ error: 'Failed to create product' });
  }
}

async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = await Product.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).lean();
    if (!updated) return res.status(404).json({ error: 'Product not found' });
    return res.json(updated);
  } catch (err) {
    console.error('[productController] updateProduct error:', err);
    return res.status(500).json({ error: 'Failed to update product' });
  }
}

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
};
