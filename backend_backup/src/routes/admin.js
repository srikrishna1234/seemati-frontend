// backend/src/routes/admin.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Import Product model (adjusted path for your structure)
const Product = require('../../models/Product');

// ---------- File Upload Setup ----------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // from backend/src/routes -> go up two levels to backend/uploads
    const dir = path.join(__dirname, '..', '..', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// ---------- Simple Admin Authentication (dev) ----------
// Accepts token via header 'x-admin-token' OR query string ?token=...
// In production replace with real auth (users + JWT / sessions).
function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (!process.env.ADMIN_TOKEN) {
    console.warn('WARNING: ADMIN_TOKEN is not set in environment. Restrict access in production!');
    // For dev convenience, allow if token not set — but you can change this to force env variable.
    return next();
  }
  if (token && token === process.env.ADMIN_TOKEN) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

// ---------- Routes ----------

// Create a new product
// multipart/form-data with fields: title, description, price, sku, category, stock
// files: images[] (optional)
router.post('/product', adminAuth, upload.array('images', 6), async (req, res) => {
  try {
    const { title, description, price, sku, category, stock } = req.body;
    if (!title || typeof price === 'undefined') {
      return res.status(400).json({ error: 'title and price are required' });
    }

    const images = (req.files || []).map(f => `/uploads/${f.filename}`);
    const slug = title.toString().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');

    const product = new Product({
      title,
      description,
      price: Number(price),
      sku,
      images,
      stock: Number(stock || 0),
      category,
      slug
    });

    await product.save();
    res.json({ ok: true, product });
  } catch (err) {
    console.error('POST /admin-api/product error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all products (admin)
router.get('/products', adminAuth, async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    console.error('GET /admin-api/products error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single product by ID
router.get('/product/:id', adminAuth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Not found' });
    res.json(product);
  } catch (err) {
    console.error('GET /admin-api/product/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a product (optionally replace images)
// multipart/form-data allowed to replace images by sending new images[]
router.put('/product/:id', adminAuth, upload.array('images', 6), async (req, res) => {
  try {
    const updates = { ...req.body };

    // If files provided, replace images array with new uploaded files
    if (req.files && req.files.length) {
      updates.images = (req.files || []).map(f => `/uploads/${f.filename}`);
    }

    // Ensure numeric fields are converted
    if (updates.price) updates.price = Number(updates.price);
    if (updates.stock) updates.stock = Number(updates.stock);

    const product = await Product.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!product) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true, product });
  } catch (err) {
    console.error('PUT /admin-api/product/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a product
router.delete('/product/:id', adminAuth, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /admin-api/product/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
