// backend/src/routes/adminProduct.cjs
// Safe admin product routes (CommonJS)
// Mount at /admin-api in server (app.js)

/**
 * NOTE:
 * - Uploads now go to S3. Requires env vars:
 *   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_REGION, S3_BUCKET
 * - If you prefer a local test (ephemeral), use the old disk uploader.
 */

const express = require("express");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");

// Multer (we'll use memoryStorage for S3 upload)
const multer = require("multer");

// AWS SDK v3
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");

let jwt = null;
try {
  jwt = require("jsonwebtoken");
} catch (e) {
  jwt = null;
}

const router = express.Router();

// Resolve Product model
let Product = null;
try {
  const prodPath = path.join(__dirname, "..", "..", "models", "Product.js");
  Product = require(prodPath);
  Product = Product && (Product.default || Product);
} catch (e) {
  console.error("[adminProduct] Failed to load Product model:", e && e.message ? e.message : e);
  Product = null;
}

// -------------------
// Authentication helper
// -------------------
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || null;
const JWT_SECRET = process.env.JWT_SECRET || null;

function getBearerToken(req) {
  const h = req.get("authorization") || req.get("Authorization") || "";
  if (!h) return null;
  return h.replace(/^\s*Bearer\s+/i, "").trim() || null;
}

function checkAdminAuth(req, res, next) {
  try {
    const token = getBearerToken(req);
    console.log("[adminProduct] checkAdminAuth - token present?", !!token);

    if (!token) return res.status(401).json({ ok: false, message: "Unauthorized" });

    if (ADMIN_TOKEN && token === ADMIN_TOKEN) {
      req.admin = { via: "admin_token" };
      console.log("[adminProduct] authorized via ADMIN_TOKEN");
      return next();
    }

    if (jwt) {
      console.log("[adminProduct] JWT lib present. JWT_SECRET defined?", !!JWT_SECRET);
      if (!JWT_SECRET) return res.status(401).json({ ok: false, message: "Unauthorized" });

      try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.admin = { via: "jwt", payload };
        console.log("[adminProduct] token verified — payload:", payload);
        return next();
      } catch (e) {
        console.warn("[adminProduct] jwt.verify failed:", e && e.message ? e.message : e);
        return res.status(401).json({ ok: false, message: "Unauthorized" });
      }
    }

    return res.status(401).json({ ok: false, message: "Unauthorized" });
  } catch (err) {
    console.error("[adminProduct] auth middleware error:", err && err.message ? err.message : err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
}

// -------------------
// Helpers
// -------------------
function slugify(input) {
  if (!input) return "";
  const s = String(input).toLowerCase();
  return s
    .replace(/[\u2000-\u206F\u2E00-\u2E7F'!"#$%&()*+,./:;<=>?@\[\\\]^`{|}~]+/g, "-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function ensureUniqueSlug(baseSlug, excludeId) {
  if (!Product) return String(new mongoose.Types.ObjectId());

  let base = baseSlug ? String(baseSlug).trim() : "";
  if (!base) base = String(new mongoose.Types.ObjectId()).slice(0, 8);
  base = slugify(base) || String(new mongoose.Types.ObjectId()).slice(0, 8);

  let slug = base;
  let i = 0;

  const existsQuery = (candidate) => {
    if (!excludeId) return { slug: candidate };
    try {
      return { slug: candidate, _id: { $ne: mongoose.Types.ObjectId(String(excludeId)) } };
    } catch (e) {
      return { slug: candidate, _id: { $ne: excludeId } };
    }
  };

  while (await Product.exists(existsQuery(slug))) {
    i += 1;
    slug = `${base}-${i}`;
    if (i > 5000) {
      slug = `${base}-${String(new mongoose.Types.ObjectId()).slice(-6)}`;
      break;
    }
  }
  return slug;
}

function randomSuffix() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// -------------------
// S3 Upload setup
// -------------------
const S3_REGION = process.env.S3_REGION || null;
const S3_BUCKET = process.env.S3_BUCKET || null;

let s3Client = null;
if (S3_REGION && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  s3Client = new S3Client({
    region: S3_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
} else {
  if (!S3_BUCKET || !S3_REGION) {
    console.warn("[adminProduct] S3 not configured — uploads to S3 will fail until S3 env vars are set.");
  } else {
    console.warn("[adminProduct] Missing AWS credentials env vars.");
  }
}

// Multer memory storage for S3 uploads
const memoryStorage = multer.memoryStorage();
const uploader = multer({ storage: memoryStorage, limits: { fileSize: 8 * 1024 * 1024 } }); // 8MB

// -------------------
// POST /products/upload  (multipart file) -> S3
// field name: "file"
// -------------------
router.post("/products/upload", checkAdminAuth, uploader.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, message: "file required" });

    // If S3 not configured, reject (so you don't silently write to ephemeral FS)
    if (!s3Client || !S3_BUCKET || !S3_REGION) {
      console.error("[adminProduct] S3 not configured — cannot upload");
      return res.status(500).json({ ok: false, message: "Storage not configured (S3)" });
    }

    const original = req.file.originalname || "file";
    const ext = (original.match(/\.[^.]+$/) || [""])[0];
    const filename = `${Date.now()}-${uuidv4()}${ext}`;
    const key = `uploads/${filename}`;

    const params = {
      Bucket: S3_BUCKET,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype || "application/octet-stream",
      ACL: "public-read",
    };

    await s3Client.send(new PutObjectCommand(params));

    // Common public S3 URL pattern (works for standard S3 buckets)
    const url = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;

    console.log("[adminProduct] Uploaded to S3:", url);
    return res.json({ ok: true, url, filename });
  } catch (err) {
    console.error("[adminProduct] upload (S3) error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ ok: false, message: "Upload failed", error: err.message || String(err) });
  }
});

// -------------------
// (Legacy) - If you still want a local disk upload (not recommended on Render)
// You can enable a fallback route to write into `uploads/` (ephemeral).
// Keep it commented out to avoid confusion.
// -------------------
// const uploadDir = path.join(__dirname, '..', '..', 'uploads');
// try { fs.mkdirSync(uploadDir, { recursive: true }); } catch(e) {}
// const diskStorage = multer.diskStorage({ destination: (req,file,cb)=>cb(null, uploadDir), filename: (_, file, cb) => { const ts = Date.now(); const safe = String(file.originalname || 'file').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, ''); cb(null, `${ts}-${safe}`); } });
// const diskUploader = multer({ storage: diskStorage });
// router.post('/products/upload-local', checkAdminAuth, diskUploader.single('file'), (req,res)=>{ /* ... */ });

// -------------------
// CRUD routes (kept from your original file; minor hardening)
// -------------------
router.get("/products", async (req, res) => {
  try {
    if (!Product) return res.status(500).json({ ok: false, message: "Product model not available" });
    const products = await Product.find({}).sort({ createdAt: -1 }).lean();
    return res.json(products);
  } catch (err) {
    console.error("[adminProduct] GET /products error:", err && err.message ? err.message : err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

router.get("/products/:id", async (req, res) => {
  try {
    if (!Product) return res.status(500).json({ ok: false, message: "Product model not available" });
    const product = await Product.findById(req.params.id).lean();
    if (!product) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json(product);
  } catch (err) {
    console.error("[adminProduct] GET /products/:id error:", err && err.message ? err.message : err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

// -------------------
// POST /products -> create
// -------------------
router.post("/products", checkAdminAuth, async (req, res) => {
  try {
    if (!Product) return res.status(500).json({ ok: false, message: "Server error" });
    const body = req.body || {};

    console.log("[adminProduct] incoming payload:", {
      title: body.title,
      slug: body.slug,
      images: Array.isArray(body.images) ? body.images.length : body.images ? 1 : 0,
    });

    const title = (body.title || body.name || "Untitled").trim();
    const description = body.description || "";
    const price = body.price !== undefined ? Number(body.price) : 0;
    const mrp = body.mrp !== undefined ? Number(body.mrp) : price;
    const stock = body.stock !== undefined ? Number(body.stock) : 0;
    const sku = body.sku || "";
    const brand = body.brand || "";
    const category = body.category || "";
    const videoUrl = body.videoUrl || "";

    let images = Array.isArray(body.images) ? body.images.slice() : [];
    images = images
      .map((img) => {
        if (!img) return null;
        if (typeof img === "string") return { url: img, filename: String(img).split("/").pop() };
        if (typeof img === "object")
          return { filename: img.filename || (img.url && String(img.url).split("/").pop()), url: img.url || img.path || null };
        return null;
      })
      .filter(Boolean);

    const colors = Array.isArray(body.colors)
      ? body.colors
      : typeof body.colors === "string"
      ? body.colors.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const sizes = Array.isArray(body.sizes)
      ? body.sizes
      : typeof body.sizes === "string"
      ? body.sizes.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    let baseCandidate = (body.slug || "").trim();
    if (!baseCandidate || baseCandidate.toLowerCase() === "null") baseCandidate = "";
    let initialSlug = baseCandidate || slugify(title) || "";
    let slug = initialSlug && String(initialSlug).trim() ? initialSlug : `p-${String(new mongoose.Types.ObjectId()).slice(-8)}`;
    slug = String(slug);

    const doc = {
      title,
      description,
      price,
      mrp,
      stock,
      sku,
      brand,
      category,
      videoUrl,
      images,
      colors,
      sizes,
      slug,
      deleted: !!body.deleted,
      createdAt: new Date(),
    };

    console.log("[adminProduct] about to Product.create() with slug =", doc.slug);

    try {
      const created = await Product.create(doc);
      console.log("[adminProduct] created product id=", created._id, "slug=", created.slug);
      return res.status(201).json({ ok: true, product: created });
    } catch (err) {
      console.error("[adminProduct] Product.create error:", err && err.message ? err.message : err);

      if (err && err.code === 11000 && /slug/.test(err.message || "")) {
        console.warn("[adminProduct] duplicate slug error detected, regenerating slug and retrying...");
        const fallbackSlug = await ensureUniqueSlug(slugify(title) || slug);
        const fallbackDoc = { ...doc, slug: String(fallbackSlug) };
        console.log("[adminProduct] retry create with slug =", fallbackDoc.slug);

        try {
          const created2 = await Product.create(fallbackDoc);
          console.log("[adminProduct] created on retry id=", created2._id, "slug=", created2.slug);
          return res.status(201).json({ ok: true, product: created2, note: "slug regenerated after duplicate" });
        } catch (err2) {
          console.error("[adminProduct] retry Product.create failed:", err2 && err2.message ? err2.message : err2);
          return res.status(409).json({
            ok: false,
            message: "Duplicate slug retry failed",
            attemptedSlug: fallbackDoc.slug,
            error: err2.message || String(err2),
          });
        }
      }

      return res.status(500).json({ ok: false, message: "Server error", error: err.message || String(err) });
    }
  } catch (err) {
    console.error("[adminProduct] POST /products outer error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ ok: false, message: "Server error", error: err.message || String(err) });
  }
});

// -------------------
// PUT /products/:id
// -------------------
router.put("/products/:id", checkAdminAuth, async (req, res) => {
  try {
    if (!Product) return res.status(500).json({ ok: false, message: "Server error" });
    const id = req.params.id;
    const body = req.body || {};

    const update = {};
    if (body.title !== undefined) update.title = body.title;
    if (body.description !== undefined) update.description = body.description;
    if (body.price !== undefined && body.price !== null && body.price !== "") update.price = Number(body.price);
    if (body.mrp !== undefined && body.mrp !== null && body.mrp !== "") update.mrp = Number(body.mrp);
    if (body.stock !== undefined && body.stock !== null && body.stock !== "") update.stock = Number(body.stock);
    if (body.sku !== undefined) update.sku = body.sku;
    if (body.brand !== undefined) update.brand = body.brand;
    if (body.category !== undefined) update.category = body.category;
    if (body.videoUrl !== undefined) update.videoUrl = body.videoUrl;
    if (body.deleted !== undefined) update.deleted = !!body.deleted;

    if (body.colors !== undefined) {
      let colors = body.colors;
      if (typeof colors === "string") colors = colors.split(",").map((s) => s.trim()).filter(Boolean);
      update.colors = Array.isArray(colors) ? colors : [];
    }

    if (body.sizes !== undefined) {
      let sizes = body.sizes;
      if (typeof sizes === "string") sizes = sizes.split(",").map((s) => s.trim()).filter(Boolean);
      update.sizes = Array.isArray(sizes) ? sizes : [];
    }

    if (body.images !== undefined && Array.isArray(body.images)) {
      update.images = body.images
        .map((img) => {
          if (!img) return null;
          if (typeof img === "string") return { url: img, filename: String(img).split("/").pop() };
          if (typeof img === "object") return { filename: img.filename, url: img.url || img.path || null };
          return null;
        })
        .filter(Boolean);
    }

    if (body.slug !== undefined && body.slug !== null && String(body.slug).trim() !== "") {
      const provided = slugify(String(body.slug));
      update.slug = await ensureUniqueSlug(provided, id);
    } else if (update.title) {
      const baseSlug = slugify(update.title);
      update.slug = await ensureUniqueSlug(baseSlug, id);
    }

    try {
      const updated = await Product.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
      if (!updated) return res.status(404).json({ ok: false, message: "Not found" });
      return res.json({ ok: true, product: updated });
    } catch (err) {
      console.error("[adminProduct] PUT update error:", err && err.message ? err.message : err);
      if (err && err.code === 11000) {
        return res.status(409).json({ ok: false, message: "Duplicate key error", keyValue: err.keyValue || null });
      }
      return res.status(500).json({ ok: false, message: "Server error" });
    }
  } catch (err) {
    console.error("[adminProduct] PUT /products/:id error:", err && err.stack ? err.stack : err);
    if (err && err.code === 11000) return res.status(409).json({ ok: false, message: "Duplicate key error" });
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

// -------------------
// DELETE /products/:id
// -------------------
router.delete("/products/:id", checkAdminAuth, async (req, res) => {
  try {
    const removed = await Product.findByIdAndDelete(req.params.id).lean();
    if (!removed) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true });
  } catch (err) {
    console.error("[adminProduct] DELETE /products/:id error:", err && err.message ? err.message : err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

module.exports = router;
