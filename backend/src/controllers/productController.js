// backend/src/controllers/productController.js
// DB-backed product controller using Mongoose Product model.
// Ensures all image URLs returned are absolute (respecting BACKEND_URL env var).

const Product = require('../../models/Product');
const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.HOST ||
  process.env.REACT_APP_API_URL ||
  "http://localhost:4000";

const PLACEHOLDER_PATH = "/images/placeholder.png";

function makeAbsoluteUrl(src) {
  if (!src) {
    return `${BACKEND_URL.replace(/\/+$/, "")}${PLACEHOLDER_PATH}`;
  }
  if (typeof src === "string" && /^https?:\/\//i.test(src)) {
    return src;
  }
  const path = typeof src === "string" ? src : String(src);
  const ensured = path.startsWith("/") ? path : `/${path}`;
  return `${BACKEND_URL.replace(/\/+$/, "")}${ensured}`.replace(/([^:]\/)\/+/g, "$1");
}

function normalizeProduct(product) {
  if (!product) return null;
  const obj = product.toObject ? product.toObject() : { ...product };

  // Normalize images field: allow array of {url, filename} or array of strings
  const collected = [];
  if (Array.isArray(obj.images) && obj.images.length) {
    for (const item of obj.images) {
      if (!item) continue;
      if (typeof item === "string") collected.push(item);
      else if (item.url) collected.push(item.url);
      else if (item.filename) collected.push(item.filename);
    }
  }

  // Fallback to thumbnail or image fields
  if (!collected.length && obj.thumbnail) collected.push(obj.thumbnail);
  if (!collected.length && obj.image) collected.push(obj.image);

  const normalizedImages =
    collected.length > 0 ? collected.map((s) => makeAbsoluteUrl(s)) : [makeAbsoluteUrl(null)];

  obj.images = normalizedImages;
  obj.image = normalizedImages[0];
  obj.thumbnail = obj.thumbnail ? makeAbsoluteUrl(obj.thumbnail) : obj.image;

  return obj;
}

// GET /products
async function listProducts(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.max(1, parseInt(req.query.limit || "20", 10));
    const skip = (page - 1) * limit;
    const q = req.query.q ? req.query.q.trim() : null;

    const filter = q
      ? { $or: [{ title: new RegExp(q, "i") }, { description: new RegExp(q, "i") }] }
      : {};

    const fields = req.query.fields ? req.query.fields.split(',').join(' ') : null;

    const [products, total] = await Promise.all([
      Product.find(filter).select(fields || '').skip(skip).limit(limit).lean().exec(),
      Product.countDocuments(filter).exec(),
    ]);

    const normalized = products.map((p) => normalizeProduct(p));
    return res.json({ ok: true, products: normalized, meta: { page, limit, total } });
  } catch (err) {
    console.error("listProducts error", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}

// GET /products/:id
async function getProduct(req, res) {
  try {
    const id = req.params.id;
    const product = await Product.findById(id).lean().exec();
    if (!product) return res.status(404).json({ ok: false, error: "Product not found" });
    return res.json({ ok: true, product: normalizeProduct(product) });
  } catch (err) {
    console.error("getProduct error", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}

module.exports = {
  listProducts,
  getProduct,
};
