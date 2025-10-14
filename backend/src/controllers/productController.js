// backend/src/controllers/productController.js
// In-memory sample products (demo). Normalizes image fields to absolute URLs
// and ensures a fallback placeholder image when an image is missing.

const HOST = process.env.HOST || process.env.REACT_APP_API_URL || 'http://localhost:4000';

const SAMPLE_PRODUCTS = [
  {
    id: "p1",
    title: "Seemati Leggings - Black",
    price: 249.0,
    description: "Comfort stretch leggings in breathable fabric.",
    image: "https://via.placeholder.com/400x300?text=Leggings+Black",
    stock: 120,
  },
  {
    id: "p2",
    title: "Seemati Kurti Pants - Blue",
    price: 399.0,
    description: "Stylish kurti pants with elastic waist.",
    image: "/images/leggings.png", // example backend-relative path
    stock: 55,
  },
  {
    id: "p3",
    title: "Seemati Palazzo - Maroon",
    price: 499.0,
    description: "Flowy palazzo with soft cotton blend.",
    image: "", // missing image to demonstrate placeholder fallback
    stock: 30,
  },
];

function makeAbsoluteUrl(src) {
  if (!src) return `${HOST}/images/placeholder.png`;
  if (/^https?:\/\//i.test(src)) return src;
  // ensure leading slash
  const path = src.startsWith('/') ? src : `/${src}`;
  return `${HOST}${path}`.replace(/([^:]\/)\/+/g, '$1');
}

function normalizeProduct(p) {
  // Return a new object (do not mutate original)
  const obj = { ...p };
  // Support single `image` field or an `images` array in future
  const imgs = [];
  if (Array.isArray(obj.images) && obj.images.length) {
    imgs.push(...obj.images);
  } else if (obj.image) {
    imgs.push(obj.image);
  }
  // Map to absolute URLs and ensure at least one (placeholder if empty)
  const normalized = imgs.length ? imgs.map(makeAbsoluteUrl) : [`${HOST}/images/placeholder.png`];
  obj.images = normalized;
  // Remove single `image` if you prefer (optional). Keep both to be safe:
  // delete obj.image;
  return obj;
}

function listProducts(req, res) {
  try {
    const normalized = SAMPLE_PRODUCTS.map(normalizeProduct);
    return res.json({ ok: true, products: normalized });
  } catch (err) {
    console.error('listProducts error', err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}

function getProduct(req, res) {
  try {
    const id = req.params.id;
    const item = SAMPLE_PRODUCTS.find((p) => p.id === id);
    if (!item) return res.status(404).json({ ok: false, error: "Product not found" });
    const normalized = normalizeProduct(item);
    return res.json({ ok: true, product: normalized });
  } catch (err) {
    console.error('getProduct error', err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}

module.exports = { listProducts, getProduct };
