// backend/src/controllers/productController.js
// A small, robust product controller used for demo/sample products.
// Normalizes image fields to fully-qualified URLs using BACKEND_URL env var.
// Exports: listProducts(req,res), getProduct(req,res)

const BACKEND_URL =
  // Prefer explicit env var for production deployment
  process.env.BACKEND_URL ||
  // fallbacks (kept for compatibility with older env names)
  process.env.HOST ||
  process.env.REACT_APP_API_URL ||
  "http://localhost:4000";

const PLACEHOLDER_PATH = "/images/placeholder.png";

/**
 * SAMPLE_PRODUCTS - in-memory demo dataset.
 * In a real app this will be replaced by DB queries (e.g., Product.find()).
 */
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
    image: "/images/leggings.png", // backend-relative path
    stock: 55,
  },
  {
    id: "p3",
    title: "Seemati Palazzo - Maroon",
    price: 499.0,
    description: "Flowy palazzo with soft cotton blend.",
    image: "", // missing image -> placeholder
    stock: 30,
  },
];

/**
 * Make an absolute URL for an image/path.
 * - If src is an absolute URL (http/https) it is returned as-is.
 * - If src is empty/falsey -> placeholder URL (BACKEND_URL + PLACEHOLDER_PATH)
 * - Otherwise prepend BACKEND_URL (ensures single slash)
 */
function makeAbsoluteUrl(src) {
  if (!src) {
    return `${BACKEND_URL.replace(/\/+$/, "")}${PLACEHOLDER_PATH}`;
  }
  if (typeof src === "string" && /^https?:\/\//i.test(src)) {
    return src;
  }
  const path = typeof src === "string" ? src : String(src);
  const ensured = path.startsWith("/") ? path : `/${path}`;
  // remove duplicate slashes while preserving protocol (e.g. https://)
  return `${BACKEND_URL.replace(/\/+$/, "")}${ensured}`.replace(/([^:]\/)\/+/g, "$1");
}

/**
 * Normalize product object shape, returning a NEW object.
 * - Ensures `images` is an array of absolute URLs (strings).
 * - Supports several input shapes:
 *    product.image (string), product.images (array of strings | objects with .url)
 * - Leaves other product fields untouched.
 */
function normalizeProduct(product) {
  const obj = { ...product }; // shallow clone to avoid mutating original

  // collect possible image values
  const collected = [];

  // If images is an array, extract strings and objects with url property
  if (Array.isArray(obj.images) && obj.images.length) {
    for (const item of obj.images) {
      if (!item) continue;
      if (typeof item === "string") {
        collected.push(item);
      } else if (typeof item === "object" && item.url) {
        collected.push(item.url);
      } else if (typeof item === "object" && item.filename) {
        // some codestores keep only filename: "/uploads/abc.jpg" or "abc.jpg"
        collected.push(item.filename);
      }
    }
  }

  // If single image field exists, use it
  if (!collected.length && obj.image) {
    if (typeof obj.image === "string") {
      collected.push(obj.image);
    } else if (typeof obj.image === "object" && obj.image.url) {
      collected.push(obj.image.url);
    } else if (typeof obj.image === "object" && obj.image.filename) {
      collected.push(obj.image.filename);
    }
  }

  // Map to absolute URLs
  const normalizedImages =
    collected.length > 0 ? collected.map((s) => makeAbsoluteUrl(s)) : [makeAbsoluteUrl(null)];

  // set normalized images array (string URLs)
  obj.images = normalizedImages;

  // Optionally keep `image` for backward compatibility:
  if (!obj.image) {
    obj.image = normalizedImages[0];
  } else {
    // update single image to absolute form
    obj.image = normalizedImages[0];
  }

  return obj;
}

/**
 * listProducts - returns all sample products (normalized)
 */
function listProducts(req, res) {
  try {
    const normalized = SAMPLE_PRODUCTS.map(normalizeProduct);
    // Keep response format easy to use: { ok: true, products: [...] }
    return res.json({ ok: true, products: normalized });
  } catch (err) {
    console.error("listProducts error", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}

/**
 * getProduct - returns single product by id (normalized)
 */
function getProduct(req, res) {
  try {
    const id = req.params.id;
    const item = SAMPLE_PRODUCTS.find((p) => p.id === id);
    if (!item) return res.status(404).json({ ok: false, error: "Product not found" });
    const normalized = normalizeProduct(item);
    return res.json({ ok: true, product: normalized });
  } catch (err) {
    console.error("getProduct error", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}

module.exports = { listProducts, getProduct };
