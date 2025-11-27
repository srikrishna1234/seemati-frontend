// backend/src/routes/productRoutes.cjs
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Load Product model
const Product = require("../models/Product.cjs");

// Local upload folder (ONLY if you're not using S3)
const UPLOADS_DIR = path.join(__dirname, "../../uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

/* helpers */
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

/* GET list (unchanged) */
router.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(200, parseInt(req.query.limit, 10) || 20));
    const fields = req.query.fields ? req.query.fields.split(",").map(f => f.trim()).filter(Boolean) : null;
    const sortQuery = req.query.sort || "-createdAt";

    const projection = fields ? fields.join(" ") : null;
    const skip = (page - 1) * limit;
    const query = {};

    const [items, total] = await Promise.all([
      Product.find(query, projection).sort(sortQuery).skip(skip).limit(limit).lean(),
      Product.countDocuments(query)
    ]);

    const itemsWithAbsoluteImages = items.map(item => {
      try {
        item.images = makeAbsoluteImageUrls(item.images || [], req);
        const thumb = normalizeImageEntry(item.thumbnail);
        if (thumb) {
          if (thumb.startsWith("http://") || thumb.startsWith("https://")) item.thumbnail = thumb;
          else if (thumb.startsWith("/")) item.thumbnail = `${process.env.BASE_URL || `${req.protocol}://${req.get("host")}`}${thumb}`;
          else item.thumbnail = `${process.env.BASE_URL || `${req.protocol}://${req.get("host")}`}/${thumb}`;
        }
      } catch (err) {
        console.warn("Warning converting images for product id", item._id, err && err.message ? err.message : err);
        item.images = [];
      }
      return item;
    });

    return res.json(itemsWithAbsoluteImages);
  } catch (err) {
    console.error("GET /api/products error:", err && err.stack ? err.stack : err);
    next(err);
  }
});

/* GET single (unchanged) */
router.get("/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid product id" });
    const product = await Product.findById(id).lean();
    if (!product) return res.status(404).json({ message: "Product not found" });

    product.images = makeAbsoluteImageUrls(product.images || [], req);
    const thumb = normalizeImageEntry(product.thumbnail);
    if (thumb) {
      if (thumb.startsWith("http://") || thumb.startsWith("https://")) product.thumbnail = thumb;
      else if (thumb.startsWith("/")) product.thumbnail = `${process.env.BASE_URL || `${req.protocol}://${req.get("host")}`}${thumb}`;
      else product.thumbnail = `${process.env.BASE_URL || `${req.protocol}://${req.get("host")}`}/${thumb}`;
    }

    return res.json(product);
  } catch (err) {
    console.error("GET /api/products/:id error:", err && err.stack ? err.stack : err);
    next(err);
  }
});

/* PUT JSON update (unchanged from previous) */
router.put("/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid product id" });

    const body = { ...req.body };

    if (body.colors && typeof body.colors === "string") {
      body.colors = body.colors.split(",").map(s => s.trim()).filter(Boolean);
    }
    if (body.sizes && typeof body.sizes === "string") {
      body.sizes = body.sizes.split(",").map(s => s.trim()).filter(Boolean);
    }

    if (body.images) {
      let imgs = body.images;
      if (typeof imgs === "string") {
        try { imgs = JSON.parse(imgs); } catch (e) { imgs = [imgs]; }
      }
      if (Array.isArray(imgs)) body.images = imgs.map(normalizeImageEntry).filter(Boolean);
      else delete body.images;
    }

    if (body.published !== undefined) {
      body.published = (body.published === true || body.published === "true" || body.published === "1");
    }

    const allowed = [
      "title","slug","price","description","images","tags","stock","thumbnail",
      "mrp","compareAtPrice","sku","brand","category","colors","sizes","videoUrl","published"
    ];

    const updates = {};
    allowed.forEach((k) => {
      if (body[k] !== undefined) updates[k] = body[k];
    });

    const updated = await Product.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).lean();
    if (!updated) return res.status(404).json({ message: "Product not found" });

    updated.images = makeAbsoluteImageUrls(updated.images || [], req);
    return res.json(updated);
  } catch (err) {
    console.error("PUT JSON update error:", err && err.stack ? err.stack : err);
    next(err);
  }
});

/* --------- PUT multipart upload (images) - IMPROVED: preserve file extension --------- */
router.put("/:id/upload", upload.array("images"), async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid product id" });
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Parse keepImages (existing image URLs to keep)
    let keepImages = [];
    if (req.body.keepImages) {
      try { keepImages = JSON.parse(req.body.keepImages); } catch (parseErr) {
        if (typeof req.body.keepImages === "string") keepImages = [req.body.keepImages];
      }
    }

    const uploadedFiles = [];
    for (const file of (req.files || [])) {
      try {
        // detect extension from originalname (fallback to empty)
        const origExt = path.extname(file.originalname || "") || "";
        const newFilename = origExt ? `${path.basename(file.path)}${origExt}` : path.basename(file.path);
        const oldFull = file.path;
        const newFull = path.join(path.dirname(oldFull), newFilename);

        // rename temp file to include extension if not already done
        if (!oldFull.endsWith(origExt) && origExt) {
          try {
            fs.renameSync(oldFull, newFull);
          } catch (renameErr) {
            console.warn("Could not rename uploaded file to include extension:", renameErr && renameErr.message);
          }
        }

        // push the web path (leading slash)
        uploadedFiles.push(`/uploads/${path.basename(newFull)}`);
      } catch (err) {
        console.warn("Error handling uploaded file:", err && err.message ? err.message : err);
      }
    }

    const newImagesArray = [...(keepImages || []), ...uploadedFiles];

    // update a few fields if they were provided (same as before)
    if (req.body.title !== undefined) product.title = req.body.title;
    if (req.body.slug !== undefined) product.slug = req.body.slug;
    if (req.body.price !== undefined) product.price = req.body.price;
    if (req.body.description !== undefined) product.description = req.body.description;
    if (req.body.tags !== undefined) product.tags = req.body.tags;
    if (req.body.stock !== undefined) product.stock = req.body.stock;
    if (req.body.thumbnail !== undefined) product.thumbnail = req.body.thumbnail;

    // Optional: delete files that are no longer kept (if they are local /uploads/)
    // compute removed = product.images - keepImages
    try {
      const prevImages = product.images || [];
      const removed = prevImages.filter(pi => !newImagesArray.includes(pi));
      for (const rem of removed) {
        try {
          let relative = normalizeImageEntry(rem) || "";
          const base = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
          if (relative.startsWith(base)) relative = relative.replace(base, "");
          if (relative.startsWith("/uploads/")) {
            await deleteLocalUploadFile(relative);
          }
        } catch (err) {
          console.warn("Failed deleting old image:", err && err.message ? err.message : err);
        }
      }
    } catch (e) {
      console.warn("Error while deleting old images:", e && e.message ? e.message : e);
    }

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

/* DELETE unchanged */
router.delete("/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid product id" });
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
