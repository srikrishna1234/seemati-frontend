// backend/src/routes/uploadRoutes.cjs
// Upload routes - supports both:
//  - POST /upload
//  - PUT /:id/upload

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const router = express.Router();

// -------------------------
// LOAD PRODUCT MODEL (ROBUST)
// -------------------------
let Product;
try {
  Product = require('../models/product.cjs');
} catch (err1) {
  try {
    Product = require(path.join(__dirname, '..', 'models', 'product.cjs'));
  } catch (err2) {
    try {
      Product = require(path.join(__dirname, '..', '..', 'models', 'product.cjs'));
    } catch (err3) {
      console.error('[UPLOAD ROUTES] FAILED TO LOAD PRODUCT MODEL');
      console.error(err1.message);
      console.error(err2.message);
      console.error(err3.message);
      throw err3;
    }
  }
}

// -------------------------
// MULTER: MEMORY STORAGE
// -------------------------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024, files: 20 }
});

// -------------------------
// S3 CONFIG (IF AVAILABLE)
// -------------------------
let useS3 = false;
let s3Client = null;
let PutObjectCommand = null;

if (process.env.S3_BUCKET_NAME && process.env.AWS_REGION) {
  try {
    const { S3Client, PutObjectCommand: Cmd } = require('@aws-sdk/client-s3');
    s3Client = new S3Client({ region: process.env.AWS_REGION });
    PutObjectCommand = Cmd;
    useS3 = true;
    console.log('[uploadRoutes] S3 enabled');
  } catch (e) {
    console.warn('[uploadRoutes] Failed to init S3, using local storage:', e?.message);
    useS3 = false;
  }
}

// -------------------------
// LOCAL STORAGE FALLBACK
// -------------------------
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch {}
}

function s3Url(bucket, region, key) {
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

async function uploadBufferToS3(buffer, originalname, mimetype) {
  const key = `products/${Date.now()}-${randomUUID()}-${originalname.replace(/\s+/g, '_')}`;
  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mimetype
  }));
  return { key, url: s3Url(process.env.S3_BUCKET_NAME, process.env.AWS_REGION, key) };
}

async function writeBufferLocally(buffer, originalname) {
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e6)}-${originalname.replace(/\s+/g, '_')}`;
  const abs = path.join(uploadsDir, filename);
  await fs.promises.writeFile(abs, buffer);
  return { key: filename, url: `/uploads/${filename}` };
}

async function uploadFile(file) {
  const originalname = file.originalname || 'file';
  if (useS3 && s3Client) {
    try {
      return await uploadBufferToS3(file.buffer, originalname, file.mimetype);
    } catch (err) {
      console.warn('[uploadRoutes] S3 failed, fallback to local:', err?.message);
      return await writeBufferLocally(file.buffer, originalname);
    }
  }
  return await writeBufferLocally(file.buffer, originalname);
}

// -------------------------
// POST /upload
// -------------------------
router.post('/upload', upload.any(), async (req, res) => {
  try {
    if (!req.files?.length) {
      return res.status(400).json({ success: false, error: 'No files uploaded' });
    }

    const uploaded = [];
    for (const file of req.files) {
      uploaded.push(await uploadFile(file));
    }

    const first = uploaded[0] || null;
    return res.json({
      uploaded,
      key: first?.key || null,
      url: first?.url || null
    });
  } catch (err) {
    console.error('[uploadRoutes] POST error:', err);
    return res.status(500).json({ success: false, error: 'Upload failed', details: err?.message });
  }
});

// -------------------------
// PUT /:id/upload
// -------------------------
router.put('/:id/upload', upload.any(), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.files?.length) {
      return res.status(400).json({ success: false, error: 'No files uploaded' });
    }

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    const uploaded = [];
    for (const file of req.files) {
      const r = await uploadFile(file);
      uploaded.push(r);
      product.images.push(r.url);
    }

    await product.save();

    const first = uploaded[0] || null;
    return res.json({
      uploaded,
      key: first?.key || null,
      url: first?.url || null
    });
  } catch (err) {
    console.error('[uploadRoutes] PUT error:', err);
    return res.status(500).json({ success: false, error: 'Upload failed', details: err?.message });
  }
});

module.exports = router;
