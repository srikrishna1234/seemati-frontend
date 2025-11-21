// backend/src/routes/adminProduct.cjs
// Defensive admin-product routes (CommonJS).
// - returns 503 if DB or model not ready
// - logs full stack traces server-side (so Render logs show cause)
// - attempts to require/import Product model (CommonJS fallback)
// - preserves admin auth checks (ADMIN_TOKEN or JWT)

const express = require('express');
const router = express.Router();
const { createRequire } = require('module');
const requireLocal = createRequire(__filename);
const jwt = require('jsonwebtoken');
let mongoose;
try { mongoose = require('mongoose'); } catch (e) { mongoose = null; }

// Helper: load Product model (CommonJS require preferred)
function loadProductModel() {
  try {
    const p = requireLocal('../models/Product.js');
    if (p && (p.default || p.Product || p)) {
      return p.default || p.Product || p;
    }
  } catch (e) {
    // fallback: try require with .cjs extension
    try {
      const p2 = requireLocal('../models/Product.cjs');
      if (p2 && (p2.default || p2.Product || p2)) return p2.default || p2.Product || p2;
    } catch (e2) {
      // nothing
    }
  }
  return null;
}

const Product = loadProductModel();

// Admin auth helper (mirrors your other server helpers)
function checkAdminAuth(req) {
  const ADMIN_TOKEN = process.env.ADMIN_TOKEN || null;
  const JWT_SECRET = process.env.JWT_SECRET || null;
  const auth = req.headers.authorization || '';
  if (!auth) return false;
  const parts = auth.split(/\s+/);
  if (parts.length !== 2) return false;
  const [scheme, token] = parts;
  if (!/^Bearer$/i.test(scheme)) return false;
  if (ADMIN_TOKEN && token === ADMIN_TOKEN) return true;
  if (JWT_SECRET) {
    try {
      jwt.verify(token, JWT_SECRET);
      return true;
    } catch (e) {
      return false;
    }
  }
  return false;
}

function isDbReady() {
  try {
    if (!mongoose) return false;
    const st = mongoose.connection && mongoose.connection.readyState;
    return st === 1;
  } catch (e) {
    return false;
  }
}

// GET /admin-api/products
router.get('/products', async (req, res) => {
  try {
    // Defensive checks
    if (!Product) {
      console.error('[adminProduct] Product model not loaded. require attempted from ../models/Product.js or ../models/Product.cjs');
      return res.status(503).json({ ok: false, message: 'Service unavailable: product model not loaded (see server logs)' });
    }
    if (!isDbReady()) {
      console.error('[adminProduct] MongoDB not connected (readyState). MONGODB_URI might be missing or connection failing.');
      return res.status(503).json({ ok: false, message: 'Service unavailable: database not ready (check MONGODB_URI in environment)' });
    }

    // Check admin auth
    if (!checkAdminAuth(req)) {
      return res.status(401).json({ ok: false, message: 'Unauthorized' });
    }

    // Pagination + simple query
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, Math.min(200, parseInt(req.query.limit || '50', 10)));
    const skip = (page - 1) * limit;
    const q = {};
    if (req.query.q) {
      q.$or = [
        { title: { $regex: req.query.q, $options: 'i' } },
        { slug: { $regex: req.query.q, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      Product.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      Product.countDocuments(q),
    ]);

    return res.json({ ok: true, page, limit, total, items });
  } catch (err) {
    console.error('[adminProduct] unexpected error in GET /admin-api/products:', err && (err.stack || err));
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

module.exports = router;
