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

// Helper: convert stored image paths (e.g. "/uploads/abc.jpg") to absolute URLs
function makeAbsoluteImageUrls(images = [], req) {
  if (!Array.isArray(images)) return images;
  const base = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
  return images.map((img) => {
    if (!img) return img;
    // already absolute
    if (img.startsWith("http://") || img.startsWith("https://")) return img;
    // relative path beginning with '/'
    if (img.startsWith("/")) return `${base}${img}`;
    // fallback: prepend base
    return `${base}/${img}`;
  });
}

// Helper: delete local upload files (only if path looks local under /uploads)
async function deleteLocalUploadFile(imagePath) {
  try {
    if (!imagePath) return;
    // Only delete relative uploads like "/uploads/..."
    if (!imagePath.startsWith("/uploads/")) return;

    // map "/uploads/abc.jpg" -> "<project>/uploads/abc.jpg"
    const rel = imagePath.replace(/^\//, ""); // remove leading slash
    const full = path.join(__dirname, "../../", rel);

    // Safety: ensure it's inside uploads folder
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

// ---------------------------------------------------------
// GET /api/products/:id
// ---------------------------------------------------------
router.get("/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const product = await Product.findById(id).lean();
    if (!product) return res.status(404).json({ message: "Product not found" });

    // convert images to absolute URLs for client
    product.images = makeAbsoluteImageUrls(product.images || [], req);

    return res.json(product);
  } catch (err) {
    console.error("GET /api/products/:id error:", err);
    next(err);
  }
});

// ---------------------------------------------------------
// PUT /api/products/:id — JSON UPDATE (no file upload)
// Expects body keys: title, slug, price, description, images (array)
// ---------------------------------------------------------
router.put("/:id", async (req, res, next) => {
  try {
    const id = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const allowed = ["title", "slug", "price", "description", "images", "tags", "stock"];
    const updates = {};

    allowed.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });

    const updated = await Product.findByIdAndUpdate(id, updates, {
      new: true,
    }).lean();

    if (!updated) return res.status(404).json({ message: "Product not found" });

    updated.images = makeAbsoluteImageUrls(updated.images || [], req);

    return res.json(updated);
  } catch (err) {
    console.error("PUT JSON update error:", err);
    next(err);
  }
});

// ---------------------------------------------------------
// PUT /api/products/:id/upload — MULTIPART (file upload)
// - field 'images' for new files (multiple)
// - field 'keepImages' JSON string for existing image paths to retain
// ---------------------------------------------------------
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
        console.warn("Failed to parse keepImages:", parseErr);
        // fallback: if it's a single string, try using it as one element
        if (typeof req.body.keepImages === "string") keepImages = [req.body.keepImages];
      }
    }

    // New uploaded image paths (store as relative paths like /uploads/<file>)
    const uploadedFiles = (req.files || []).map((file) => {
      return `/uploads/${path.basename(file.path)}`;
    });

    // Merge existing + new
    const newImagesArray = [...(keepImages || []), ...uploadedFiles];

    // Update fields
    if (req.body.title !== undefined) product.title = req.body.title;
    if (req.body.slug !== undefined) product.slug = req.body.slug;
    if (req.body.price !== undefined) product.price = req.body.price;
    if (req.body.description !== undefined) product.description = req.body.description;
    if (req.body.tags !== undefined) product.tags = req.body.tags;
    if (req.body.stock !== undefined) product.stock = req.body.stock;

    // If client sent images explicitly (via keepImages), replace; otherwise keep previous behavior
    product.images = newImagesArray;

    await product.save();

    const productObj = product.toObject();
    productObj.images = makeAbsoluteImageUrls(productObj.images || [], req);

    return res.json(productObj);
  } catch (err) {
    console.error("PUT multipart update error:", err);
    next(err);
  }
});

// ---------------------------------------------------------
// DELETE /api/products/:id
// - deletes DB document and local upload files referenced in product.images (only /uploads/...)
// ---------------------------------------------------------
router.delete("/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Delete local files referenced (safely)
    const images = product.images || [];
    for (const img of images) {
      try {
        // If image is absolute URL, but points to our uploads path (e.g., BASE_URL + /uploads/...), convert to relative
        let relative = img;
        const base = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
        if (relative.startsWith(base)) {
          relative = relative.replace(base, "");
        }

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
    console.error("DELETE /api/products/:id error:", err);
    next(err);
  }
});

module.exports = router;
