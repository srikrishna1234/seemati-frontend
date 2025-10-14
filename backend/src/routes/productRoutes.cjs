// backend/src/routes/adminProduct.cjs
// Admin product CRUD routes (CommonJS)
// Mount this file at /admin-api to expose:
//  GET  /products
//  POST /products
//  PUT  /products/:id
//  DELETE /products/:id
//  POST /products/upload   (multipart file upload, field name "file")

const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const router = express.Router();

const adminAuth = require("../middleware/adminAuth.cjs"); // protect admin routes

// Load Product model (backend/models/Product.js)
let Product = null;
try {
  const prodPath = path.join(__dirname, "..", "..", "models", "Product.js");
  Product = require(prodPath);
  Product = Product && (Product.default || Product);
} catch (e) {
  console.error("[adminProduct] Could not require Product model:", e && e.message ? e.message : e);
  Product = null;
}

// Upload directory - same as server static uploads dir
const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");

// ensure upload dir exists
try {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch (e) {
  // ignore
}

// multer for admin uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const ts = Date.now();
    const safe = file.originalname.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "");
    cb(null, `${ts}-${safe}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 6 * 1024 * 1024 } }); // 6MB limit

// helper to normalize image url for client (relative path)
function buildImageUrl(filename) {
  if (!filename) return null;
  // return a path like /uploads/<filename>
  if (filename.startsWith("/")) return filename;
  return `/uploads/${filename}`;
}

// -----------------------------
// GET /products  (admin list)
// -----------------------------
router.get("/products", adminAuth, async (req, res) => {
  try {
    if (!Product || !Product.find) return res.status(500).json({ ok: false, message: "Product model not available" });

    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || "50", 10)));
    const skip = (page - 1) * limit;

    const filter = {};
    // allow filtering by deleted flag
    if (req.query.includeDeleted !== "1") {
      filter.deleted = { $ne: true };
    }
    // optional category filter
    if (req.query.category) filter.category = String(req.query.category);

    const [items, total] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      Product.countDocuments(filter).exec(),
    ]);

    return res.json({ ok: true, page, limit, total, products: items });
  } catch (err) {
    console.error("[adminProduct] GET /products error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

// -----------------------------
// POST /products  (create)
// body: JSON { title, description, price, mrp, stock, category, images: [{ filename, url }], colors, sizes, ... }
// -----------------------------
router.post("/products", adminAuth, async (req, res) => {
  try {
    if (!Product || !Product.create) return res.status(500).json({ ok: false, message: "Product model not available" });

    const payload = req.body || {};
    // sanitize fields (basic)
    const doc = {
      title: payload.title || payload.name || "Untitled",
      description: payload.description || "",
      price: payload.price != null ? Number(payload.price) : 0,
      mrp: payload.mrp != null ? Number(payload.mrp) : undefined,
      sku: payload.sku || "",
      stock: payload.stock != null ? Number(payload.stock) : 0,
      brand: payload.brand || "",
      category: payload.category || "",
      colors: Array.isArray(payload.colors) ? payload.colors : (payload.colors ? String(payload.colors).split(",").map(s=>s.trim()) : []),
      sizes: Array.isArray(payload.sizes) ? payload.sizes : (payload.sizes ? String(payload.sizes).split(",").map(s=>s.trim()) : []),
      images: Array.isArray(payload.images) ? payload.images.map(i => ({ filename: i.filename, url: i.url })) : [],
      videoUrl: payload.videoUrl || "",
      deleted: !!payload.deleted,
      slug: payload.slug || undefined,
    };

    const created = await Product.create(doc);
    return res.status(201).json({ ok: true, product: created });
  } catch (err) {
    console.error("[adminProduct] POST /products error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

// -----------------------------
// PUT /products/:id  (update)
// -----------------------------
router.put("/products/:id", adminAuth, async (req, res) => {
  try {
    if (!Product || !Product.findByIdAndUpdate) return res.status(500).json({ ok: false, message: "Product model not available" });
    const { id } = req.params;
    const payload = req.body || {};

    const update = {};
    const fields = ["title","description","price","mrp","sku","stock","brand","category","videoUrl","slug","deleted"];
    fields.forEach(f => {
      if (payload[f] !== undefined) update[f] = payload[f];
    });

    if (payload.colors !== undefined) {
      update.colors = Array.isArray(payload.colors) ? payload.colors : String(payload.colors).split(",").map(s=>s.trim()).filter(Boolean);
    }
    if (payload.sizes !== undefined) {
      update.sizes = Array.isArray(payload.sizes) ? payload.sizes : String(payload.sizes).split(",").map(s=>s.trim()).filter(Boolean);
    }
    if (payload.images !== undefined) {
      update.images = Array.isArray(payload.images) ? payload.images.map(i => ({ filename:i.filename, url:i.url })) : [];
    }

    const updated = await Product.findByIdAndUpdate(id, update, { new: true, runValidators: true }).lean().exec();
    if (!updated) return res.status(404).json({ ok: false, message: "Product not found" });
    return res.json({ ok: true, product: updated });
  } catch (err) {
    console.error("[adminProduct] PUT /products/:id error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

// -----------------------------
// DELETE /products/:id  (soft delete by default)
// optional query ?hard=1 to hard-delete
// -----------------------------
router.delete("/products/:id", adminAuth, async (req, res) => {
  try {
    if (!Product || !Product.findByIdAndUpdate) return res.status(500).json({ ok: false, message: "Product model not available" });
    const { id } = req.params;
    const hard = req.query.hard === "1";

    if (hard) {
      const removed = await Product.findByIdAndDelete(id).lean().exec();
      if (!removed) return res.status(404).json({ ok: false, message: "Product not found" });
      return res.json({ ok: true, message: "Product removed" });
    } else {
      const updated = await Product.findByIdAndUpdate(id, { $set: { deleted: true } }, { new: true }).lean().exec();
      if (!updated) return res.status(404).json({ ok: false, message: "Product not found" });
      return res.json({ ok: true, product: updated });
    }
  } catch (err) {
    console.error("[adminProduct] DELETE /products/:id error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

// -----------------------------
// POST /products/upload  (multipart file) -> returns { ok: true, url }
// field name: "file"
// -----------------------------
router.post("/products/upload", adminAuth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, message: "file required" });
    // return a URL path the frontend can use (server serves /uploads)
    const url = `/uploads/${req.file.filename}`;
    return res.json({ ok: true, url, filename: req.file.filename });
  } catch (err) {
    console.error("[adminProduct] POST /products/upload error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ ok: false, message: "Upload failed" });
  }
});

module.exports = router;
