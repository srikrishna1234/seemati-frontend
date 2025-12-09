// backend/src/routes/uploadRoutes.cjs
// FINAL STABLE VERSION – Works on Render + Local

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const router = express.Router();

// -----------------------------------------------
// LOAD PRODUCT MODEL (supports BOTH locations)
// -----------------------------------------------
let Product = null;

// 1) backend/models/Product.cjs
try {
  Product = require(path.join(__dirname, '..', '..', 'models', 'Product.cjs'));
  console.log("[uploadRoutes] Loaded Product model from backend/models");
} catch (e1) {
  console.warn("[uploadRoutes] Failed backend/models location:", e1.message);

  // 2) backend/src/models/Product.cjs
  try {
    Product = require(path.join(__dirname, '..', 'models', 'Product.cjs'));
    console.log("[uploadRoutes] Loaded Product model from backend/src/models");
  } catch (e2) {
    console.error("[uploadRoutes] COULD NOT LOAD PRODUCT MODEL");
    console.error(e1.message, e2.message);
    throw e2;
  }
}

// -----------------------------------------------
// MULTER (memory storage for S3 uploads)
// -----------------------------------------------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 20 } // 25MB
});

// -----------------------------------------------
// S3 SETUP (if env vars exist)
// -----------------------------------------------
let useS3 = false;
let s3Client = null;
let PutObjectCommand = null;

if (process.env.S3_BUCKET_NAME && process.env.AWS_REGION) {
  try {
    const { S3Client, PutObjectCommand: Cmd } = require('@aws-sdk/client-s3');
    s3Client = new S3Client({ region: process.env.AWS_REGION });
    PutObjectCommand = Cmd;
    useS3 = true;
    console.log("[uploadRoutes] S3 ENABLED");
  } catch (err) {
    console.warn("[uploadRoutes] Failed to init AWS. Using LOCAL upload.", err.message);
  }
}

// -----------------------------------------------
// LOCAL UPLOAD DIRECTORY
// -----------------------------------------------
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

function s3Url(bucket, region, key) {
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

async function uploadBufferToS3(file) {
  const key = `products/${Date.now()}-${randomUUID()}-${file.originalname.replace(/\s+/g, "_")}`;

  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype
  };

  await s3Client.send(new PutObjectCommand(params));
  return { key, url: s3Url(process.env.S3_BUCKET_NAME, process.env.AWS_REGION, key) };
}

async function uploadBufferToLocal(file) {
  const filename = `${Date.now()}-${randomUUID()}-${file.originalname.replace(/\s+/g, "_")}`;
  const full = path.join(uploadsDir, filename);
  fs.writeFileSync(full, file.buffer);
  return { key: filename, url: `/uploads/${filename}` };
}

async function uploadOne(file) {
  if (useS3) {
    try { return await uploadBufferToS3(file); }
    catch (err) {
      console.warn("[uploadRoutes] S3 failed, fallback local:", err.message);
    }
  }
  return await uploadBufferToLocal(file);
}

// -----------------------------------------------
// POST /upload  (NO PRODUCT ID)
// -----------------------------------------------
router.post('/upload', upload.any(), async (req, res) => {
  try {
    if (!req.files?.length)
      return res.status(400).json({ success: false, error: "No files uploaded" });

    const out = [];
    for (const f of req.files) out.push(await uploadOne(f));

    return res.json({ uploaded: out, url: out[0]?.url });
  } catch (err) {
    console.error("[uploadRoutes] POST /upload error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// -----------------------------------------------
// PUT /:id/upload  (ATTACH TO PRODUCT)
// -----------------------------------------------
router.put('/:id/upload', upload.any(), async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);
    if (!product)
      return res.status(404).json({ success: false, error: "Product not found" });

    if (!req.files?.length)
      return res.status(400).json({ success: false, error: "No files uploaded" });

    const out = [];
    for (const f of req.files) {
      const up = await uploadOne(f);
      product.images.push(up.url);
      out.push(up);
    }

    await product.save();

    return res.json({ uploaded: out, url: out[0]?.url });
  } catch (err) {
    console.error("[uploadRoutes] PUT /:id/upload error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
