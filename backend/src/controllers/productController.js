// backend/src/controllers/productController.js
'use strict';

// Minimal controller with safe fallbacks so routes don't crash when model is missing
const path = require('path');
const { createRequire } = require('module');
const requireLocal = createRequire(__filename);

let Product = null;
(function tryLoad() {
  const candidates = [
    path.join(__dirname, '..', '..', 'models', 'Product.cjs'),
    path.join(__dirname, '..', '..', 'models', 'Product.js'),
    path.join(__dirname, '..', '..', 'models', 'Product'),
  ];
  for (const c of candidates) {
    try {
      const mod = requireLocal(c);
      Product = mod && (mod.default || mod.Product) ? (mod.default || mod.Product) : mod;
      if (Product) break;
    } catch (e) {}
  }
})();

async function listProducts(req, res) {
  try {
    if (!Product) return res.json({ ok: true, data: [], total: 0 });
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '20', 10)));
    const skip = (page - 1) * limit;
    const filter = {};
    const total = await Product.countDocuments(filter).exec();
    const docs = await Product.find(filter).skip(skip).limit(limit).lean().exec();
    return res.json({ ok: true, page, limit, total, data: docs });
  } catch (err) {
    console.error('productController.listProducts error:', err && (err.stack || err));
    return res.status(500).json({ ok: false, message: 'server error' });
  }
}

module.exports = { listProducts };
