// backend/src/routes/uploadRoutes.cjs
// Upload routes - supports both:
//  - POST /upload         -> upload files and return URLs (used by Add Product before product exists)
//  - PUT  /:id/upload     -> upload files, append URLs to product.images and save (used by Edit Product)
// Uses S3 when configured (S3_BUCKET_NAME + AWS_REGION + AWS credentials available to environment).
// Falls back to local disk storage under backend/uploads if S3 not configured.

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const router = express.Router();
const path = require('path');

// Auto-resolve product model from multiple possible locations
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
      console.error(err1.message, err2.message, err3.message);
      throw err3; // stop app if model missing
    }
  }
}


// Multer memory storage for easy buffer access
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 30 * 1024 * 1024, // 30 MB per file
    files: 20
  }
});

// Helpers: S3 client if configured
let useS3 = false;
let s3Client = null;
let PutObjectCommand = null;
if (process.env.S3_BUCKET_NAME && process.env.AWS_REGION) {
  try {
    const { S3Client, PutObjectCommand: Cmd } = require('@aws-sdk/client-s3');
    s3Client = new S3Client({ region: process.env.AWS_REGION });
    PutObjectCommand = Cmd;
    useS3 = true;
    console.log('[uploadRoutes] S3 configured - uploads will use S3');
  } catch (e) {
    console.warn('[uploadRoutes] AWS SDK not available or failed to init - falling back to local storage.', e && e.message ? e.message : e);
    useS3 = false;
  }
}

// Ensure uploads directory exists for local fallback
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch (e) { console.warn('[uploadRoutes] could not create uploads dir:', e); }
}

// Builds S3 public URL (standard)
function s3ObjectUrl(bucket, region, key) {
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

async function uploadBufferToS3(fileBuffer, originalname, mimetype) {
  const key = `products/${Date.now()}-${randomUUID()}-${originalname.replace(/\s+/g, '_')}`;
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: mimetype
    // DO NOT set ACL if bucket/enforcement disallows it
  };
  await s3Client.send(new PutObjectCommand(params));
  const url = s3ObjectUrl(process.env.S3_BUCKET_NAME, process.env.AWS_REGION, key);
  return { key, url };
}

async function writeBufferToLocal(fileBuffer, originalname) {
  const filename = `${Date.now()}-${Math.round(Math.random()*1e6)}-${originalname.replace(/\s+/g, '_')}`;
  const abs = path.join(uploadsDir, filename);
  await fs.promises.writeFile(abs, fileBuffer);
  const url = `/uploads/${filename}`;
  return { key: filename, url };
}

// Generic uploader that uses S3 if configured, else local writes
async function uploadFile(file) {
  if (!file) throw new Error('No file provided');
  const originalname = file.originalname || `file-${Date.now()}`;
  if (useS3 && s3Client && PutObjectCommand) {
    try {
      return await uploadBufferToS3(file.buffer, originalname, file.mimetype);
    } catch (err) {
      console.warn('[uploadRoutes] S3 upload failed, falling back to local write:', err && err.message ? err.message : err);
      return await writeBufferToLocal(file.buffer, originalname);
    }
  } else {
    return await writeBufferToLocal(file.buffer, originalname);
  }
}

// POST /upload
// Upload files (field name: 'images' expected). Returns uploaded metadata but does not attach to any product.
router.post('/upload', upload.any(), async (req, res) => {
  try {
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ success: false, error: 'No files uploaded' });

    const results = [];
    for (const file of files) {
      const r = await uploadFile(file);
      results.push(r);
    }

    const first = results[0] || null;
    const resp = { uploaded: results };
    if (first) { resp.key = first.key; resp.url = first.url; }
    return res.json(resp);
  } catch (err) {
    console.error('[uploadRoutes] POST /upload error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, error: 'Upload failed', details: err && err.message ? err.message : String(err) });
  }
});

// PUT /:id/upload
// Upload files and append resulting URLs to product.images (save product)
router.put('/:id/upload', upload.any(), async (req, res) => {
  try {
    const productId = req.params.id;
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ success: false, error: 'No files uploaded' });

    // Ensure product exists
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    const results = [];
    for (const file of files) {
      const r = await uploadFile(file);
      // Save URL strings to DB (keeps schema as strings)
      product.images = product.images || [];
      product.images.push(r.url);
      results.push(r);
    }

    await product.save();

    const first = results[0] || null;
    const resp = { uploaded: results };
    if (first) { resp.key = first.key; resp.url = first.url; }
    return res.json(resp);
  } catch (err) {
    console.error('[uploadRoutes] PUT /:id/upload error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, error: 'Upload failed', details: err && err.message ? err.message : String(err) });
  }
});

module.exports = router;
