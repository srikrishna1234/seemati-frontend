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
    getAllProducts: async (req, res) => res.status(500).json({ error: e.message }),
    getProductById: async (req, res) => res.status(500).json({ error: e.message }),
    createProduct: async (req, res) => res.status(500).json({ error: e.message }),
    updateProduct: async (req, res) => res.status(500).json({ error: e.message }),
    deleteProduct: async (req, res) => res.status(500).json({ error: e.message }),
    listProducts: async (req, res) => res.status(500).json({ error: e.message }),
    getProduct: async (req, res) => res.status(500).json({ error: e.message }),
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
    const payload = req.body;
    const p = new Product(payload);
    await p.save();
    return res.status(201).json(p);
  } catch (err) {
    console.error('[productController] createProduct error:', err);
    return res.status(500).json({ error: 'Failed to create product' });
  }
}

/* ---------- UPDATE (FIXED) ---------- */
async function updateProduct(req, res) {
  console.log("🔵 UPDATE PRODUCT HIT");
  console.log("🔵 req.body =", JSON.stringify(req.body, null, 2));

  try {
    const { id } = req.params;
    let updates = { ...req.body };

    // normalize sizes if string
    if (updates.sizes && typeof updates.sizes === 'string') {
      updates.sizes = updates.sizes
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    }

    // normalize published
    if (updates.published !== undefined) {
      updates.published =
        updates.published === true ||
        updates.published === 'true' ||
        updates.published === '1';
    }

    // allowed fields (single source of truth)
    const allowed = [
      "title",
      "slug",
      "price",
      "description",
      "images",
      "stock",
      "thumbnail",
      "mrp",
      "sku",
      "brand",
      "category",
      "colors",
      "sizes",
      "videoUrl",
      "published"
    ];

    const filtered = {};
    allowed.forEach(k => {
      if (updates[k] !== undefined) {
        filtered[k] = updates[k];
      }
    });

    // ✅ CRITICAL FIX: use $set to force overwrite
    const updated = await Product.findByIdAndUpdate(
      id,
      { $set: filtered },
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
