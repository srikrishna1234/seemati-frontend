// backend/src/routes/productRoutes.cjs
// Public product routes (CommonJS) — router paths are ROOT-relative so mounting at /products works.
// Defensive model loading and safe query parsing.
'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');
const requireLocal = createRequire(__filename);
const LOG = '[productRoutes]';

// Safe Product model loader (fallbacks)
let Product = null;
function loadProductModel() {
  if (Product) return Product;
  const candidates = [
    path.join(__dirname, '..', '..', 'models', 'Product.cjs'),
    path.join(__dirname, '..', '..', 'models', 'Product.js'),
    path.join(process.cwd(), 'backend', 'models', 'Product.cjs'),
    path.join(process.cwd(), 'backend', 'models', 'Product.js'),
  ];
  for (const c of candidates) {
    try {
      if (!fs.existsSync(c)) continue;
      const m = requireLocal(c);
      Product = m && (m.default || m.Product) ? (m.default || m.Product) : m;
      if (Product) {
        console.log(`${LOG} Loaded Product model from ${c}`);
        break;
      }
    } catch (err) {
      console.warn(`${LOG} model load failed for ${c}:`, err && err.message ? err.message : err);
    }
  }
  if (!Product) console.warn(`${LOG} Product model not found; product endpoints will return 500.`);
  return Product;
}

// Helper: parse ints safely
function parsePositiveInt(v, fallback) {
  const n = parseInt(String(v || ''), 10);
  if (Number.isNaN(n) || n <= 0) return fallback;
  return n;
}

// GET /products/        -> list products (paginated)
router.get('/', async (req, res) => {
  try {
    const Prod = loadProductModel();
    if (!Prod) return res.status(500).json({ ok: false, message: 'Product model not available' });

    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(200, parsePositiveInt(req.query.limit, 24));
    const skip = (page - 1) * limit;

    const q = (req.query.q || '').trim();
    const fieldsRaw = (req.query.fields || '').trim();
    let projection = null;
    if (fieldsRaw) {
      projection = {};
      fieldsRaw.split(',').map(s => s.trim()).filter(Boolean).forEach(f => projection[f] = 1);
    }

    const filter = { deleted: { $ne: true } };
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { slug: { $regex: q, $options: 'i' } },
      ];
    }

    const [total, products] = await Promise.all([
      Prod.countDocuments(filter).exec(),
      Prod.find(filter, projection).skip(skip).limit(limit).lean().exec()
    ]);

    const totalPages = Math.ceil((total || 0) / limit) || 1;
    return res.json({ ok: true, page, limit, total, totalPages, products });
  } catch (err) {
    console.error(`${LOG} GET / error:`, err && (err.stack || err));
    return res.status(500).json({ ok: false, message: err && err.message ? err.message : 'Server error' });
  }
});

// GET /products/:id_or_slug
router.get('/:id', async (req, res) => {
  try {
    const Prod = loadProductModel();
    if (!Prod) return res.status(500).json({ ok: false, message: 'Product model not available' });

    const id = req.params.id;
    // try by _id first, then slug
    let doc = null;
    try { doc = await Prod.findById(id).lean().exec(); } catch (e) { /* ignore invalid id */ }
    if (!doc) doc = await Prod.findOne({ slug: id }).lean().exec();
    if (!doc) return res.status(404).json({ ok: false, message: 'Not found' });
    return res.json({ ok: true, data: doc });
  } catch (err) {
    console.error(`${LOG} GET /:id error:`, err && (err.stack || err));
    return res.status(500).json({ ok: false, message: err && err.message ? err.message : 'Server error' });
  }
});

module.exports = router;
