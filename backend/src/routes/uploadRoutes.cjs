// backend/src/routes/uploadRoutes.cjs
// CommonJS route file for product image upload (PUT /api/products/:id/upload)
// This version uses the correct relative require path for Product model
// and does NOT set ACL (works with "Bucket owner enforced").

const express = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { randomUUID } = require('crypto');

const router = express.Router();

// <-- CORRECT relative path to your Product model file
const Product = require('../models/product.cjs'); // ensure lowercase, one ../ from routes -> models

// Multer: memory storage (we upload from memory to S3)
const upload = multer({ storage: multer.memoryStorage() });

// Configure S3 client (reads region from env)
const s3 = new S3Client({ region: process.env.AWS_REGION });

// Helper to build public URL for object (if you use CloudFront change accordingly)
function s3ObjectUrl(bucket, region, key) {
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

// PUT /api/products/:id/upload
router.put('/:id/upload', upload.single('image'), async (req, res) => {
  try {
    const productId = req.params.id;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const key = `products/${Date.now()}-${randomUUID()}-${req.file.originalname}`;

    const putParams = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      // DO NOT set ACL here (Bucket owner enforced)
    };

    await s3.send(new PutObjectCommand(putParams));

    const url = s3ObjectUrl(process.env.S3_BUCKET_NAME, process.env.AWS_REGION, key);

    product.images = product.images || [];
    product.images.push({ key, url });
    await product.save();

    return res.json({ key, url });
  } catch (err) {
    console.error('[uploadRoutes] S3 upload error:', err && err.stack ? err.stack : err);
    const details = err && err.message ? err.message : String(err);
    return res.status(500).json({ error: 'Upload failed', details });
  }
});

module.exports = router;
