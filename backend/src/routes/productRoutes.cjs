// backend/src/routes/productRoutes.cjs
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Load Product model (adjust path if different)
const Product = require("../models/Product.cjs");

// Local upload folder (ONLY if you're not using S3)
const UPLOADS_DIR = path.join(__dirname, "../../uploads");
const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

/**
 * Normalize an image entry to a string path/url.
 * - If entry is a string -> return it
 * - If entry is an object with .url, .path, or .key -> return that string
 * - Otherwise return null
 */
function normalizeImageEntry(img) {
  if (!img && img !== 0) return null;
  if (typeof img === "string") return img;
  if (typeof img === "object") {
    if (typeof img.url === "string") return img.url;
    if (typeof img.path === "string") return img.path;
    if (typeof img.key === "string") return img.key;
    if (typeof img.location === "string") return img.location;
    if (typeof img.src === "string") return img.src;
  }
  return null;
}

// Helper: convert stored image paths (e.g. "/uploads/abc.jpg") to absolute URLs
function makeAbsoluteImageUrls(images = [], req) {
  if (!Array.isArray(images)) return [];
  const base = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
  return images
    .map((img) => normalizeImageEntry(img))
    .filter(Boolean)
    .map((imgStr) => {
      if (imgStr.startsWith("http://") || imgStr.startsWith("https://")) return imgStr;
      if (imgStr.startsWith("/")) return `${base}${imgStr}`;
      return `${base}/${imgStr}`;
    });
}

// Helper: delete local upload files (only if path looks local under /uploads)
async function deleteLocalUploadFile(imagePath) {
  try {
    if (!imagePath) return;
    if (!imagePath.startsWith("/uploads/")) return;
    const rel = imagePath.replace(/^\//, "");
    const full = path.join(__dirname, "../../", rel);
    if (!full.startsWith(UPLOADS_DIR)) {
      console.warn("Refusing to delete file outside uploads dir:", full);
      return;
    }
    if (fs.existsSync(full)) {
      await fs.promises.unlink(full);
      console.log("Deleted local upload file:", full);
    } else {
      console.warn("File not found for deletion:", full);
    }
  } catch (err) {
    console.error("Error deleting file:", err && err.message ? err.message : err);
  }
}

/**
 * GET /
 * List products with pagination and field selection.
 */
router.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(200, parseInt(req.query.limit, 10) || 20));
    const fields = req.query.fields ? req.query.fields.split(",").map(f => f.trim()).filter(Boolean) : null;
    const sortQuery = req.query.sort || "-createdAt";

    const projection = fields ? fields.join(" ") : null;
    const skip = (page - 1) * limit;
    const query = {}; // future filters can be applied here

    const [items, total] = await Promise.all([
      Product.find(query, projection).sort(sortQuery).skip(skip).limit(limit).lean(),
      Product.countDocuments(query)
    ]);

    const itemsWithAbsoluteImages = items.map(item => {
      try {
        item.images = makeAbsoluteImageUrls(item.images || [], req);

        // handle thumbnail safely
        const thumb = normalizeImageEntry(item.thumbnail);
        if (thumb) {
          if (thumb.startsWith("http://") || thumb.startsWith("https://")) {
            item.thumbnail = thumb;
          } else if (thumb.startsWith("/")) {
            item.thumbnail = `${process.env.BASE_URL || `${req.protocol}://${req.get("host")}`}${thumb}`;
          } else {
            item.thumbnail = `${process.env.BASE_URL || `${req.protocol}://${req.get("host")}`}/${thumb}`;
          }
        }
      } catch (err) {
        console.warn("Warning converting images for product id", item._id, err && err.message ? err.message : err);
        item.images = [];
      }
      return item;
    });

    // return array (frontend expects an array)
    return res.json(itemsWithAbsoluteImages);
  } catch (err) {
    console.error("GET /api/products error:", err && err.stack ? err.stack : err);
    next(err);
  }
});

// GET /:id
router.get("/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product id" });
    }
    const product = await Product.findById(id).lean();
    if (!product) return res.status(404).json({ message: "Product not found" });

    product.images = makeAbsoluteImageUrls(product.images || [], req);

    const thumb = normalizeImageEntry(product.thumbnail);
    if (thumb) {
      if (thumb.startsWith("http://") || thumb.startsWith("https://")) {
        product.thumbnail = thumb;
      } else if (thumb.startsWith("/")) {
        product.thumbnail = `${process.env.BASE_URL || `${req.protocol}://${req.get("host")}`}${thumb}`;
      } else {
        product.thumbnail = `${process.env.BASE_URL || `${req.protocol}://${req.get("host")}`}/${thumb}`;
      }
    }

    return res.json(product);
  } catch (err) {
    console.error("GET /api/products/:id error:", err && err.stack ? err.stack : err);
    next(err);
  }
});

// PUT (JSON update) — now defensive about images shape
router.put("/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    // Normalize images if present in request body
    if (req.body.images) {
      let imgs = req.body.images;
      // sometimes body comes as JSON string
      if (typeof imgs === "string") {
        try {
          imgs = JSON.parse(imgs);
        } catch (e) {
          // leave as-is
        }
      }

      if (Array.isArray(imgs)) {
        const normalized = imgs.map(normalizeImageEntry).filter(Boolean);
        req.body.images = normalized;
      } else {
        // not an array -> remove to avoid DB cast issues
        delete req.body.images;
      }
    }

    const allowed = ["title", "slug", "price", "description", "images", "tags", "stock", "thumbnail", "mrp", "compareAtPrice"];
    const updates = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });

    const updated = await Product.findByIdAndUpdate(id, updates, { new: true }).lean();
    if (!updated) return res.status(404).json({ message: "Product not found" });

    updated.images = makeAbsoluteImageUrls(updated.images || [], req);
    return res.json(updated);
  } catch (err) {
    console.error("PUT JSON update error:", err && err.stack ? err.stack : err);
    next(err);
  }
});

// PUT upload (multipart)
router.put("/:id/upload", upload.array("images"), async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product id" });
    }
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Parse keepImages (existing image URLs to keep)
    let keepImages = [];
    if (req.body.keepImages) {
      try {
        keepImages = JSON.parse(req.body.keepImages);
      } catch (parseErr) {
        if (typeof req.body.keepImages === "string") keepImages = [req.body.keepImages];
      }
    }

    const uploadedFiles = (req.files || []).map((file) => `/uploads/${path.basename(file.path)}`);
    const newImagesArray = [...(keepImages || []), ...uploadedFiles];

    if (req.body.title !== undefined) product.title = req.body.title;
    if (req.body.slug !== undefined) product.slug = req.body.slug;
    if (req.body.price !== undefined) product.price = req.body.price;
    if (req.body.description !== undefined) product.description = req.body.description;
    if (req.body.tags !== undefined) product.tags = req.body.tags;
    if (req.body.stock !== undefined) product.stock = req.body.stock;
    if (req.body.thumbnail !== undefined) product.thumbnail = req.body.thumbnail;

    product.images = newImagesArray;
    await product.save();

    const productObj = product.toObject();
    productObj.images = makeAbsoluteImageUrls(productObj.images || [], req);
    return res.json(productObj);
  } catch (err) {
    console.error("PUT multipart update error:", err && err.stack ? err.stack : err);
    next(err);
  }
});

// DELETE
router.delete("/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product id" });
    }
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const images = product.images || [];
    for (const img of images) {
      try {
        let relative = normalizeImageEntry(img) || "";
        const base = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
        if (relative.startsWith(base)) relative = relative.replace(base, "");
        if (relative.startsWith("/uploads/")) {
          await deleteLocalUploadFile(relative);
        }
      } catch (err) {
        console.error("Error deleting referenced image:", err && err.message ? err.message : err);
      }
    }

    await product.remove();
    return res.json({ message: "Product deleted" });
  } catch (err) {
    console.error("DELETE /api/products/:id error:", err && err.stack ? err.stack : err);
    next(err);
  }
});

module.exports = router;
