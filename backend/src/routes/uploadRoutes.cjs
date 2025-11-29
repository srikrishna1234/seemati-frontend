// backend/src/routes/uploadRoutes.cjs
// Upload route (PUT /api/products/:id/upload)
// Accepts multipart with multiple files (multer.any()), uploads each to S3 (no ACL),
// saves URL strings to product.images, and returns array of { key, url }.

const express = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { randomUUID } = require('crypto');

const router = express.Router();
const Product = require('../models/product.cjs'); // correct relative path

// Multer memory storage with reasonable limits
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB per file
    files: 10 // avoid very large numbers; adjust if necessary
  }
});

// S3 client
const s3 = new S3Client({ region: process.env.AWS_REGION });

// Build public S3 URL for uploaded key
function s3ObjectUrl(bucket, region, key) {
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

// PUT /api/products/:id/upload
router.put('/:id/upload', upload.any(), async (req, res) => {
  try {
    const productId = req.params.id;
    const files = req.files || [];

    if (!files.length) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Ensure product exists
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const results = [];

    // Upload each file sequentially (you can parallelize if desired)
    for (const file of files) {
      // Build a safe unique key
      const key = `products/${Date.now()}-${randomUUID()}-${file.originalname}`;

      const putParams = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype
        // DO NOT set ACL (Bucket owner enforced)
      };

      await s3.send(new PutObjectCommand(putParams));

      const url = s3ObjectUrl(process.env.S3_BUCKET_NAME, process.env.AWS_REGION, key);

      // Store URL string in DB (keeps existing schema as strings)
      product.images = product.images || [];
      product.images.push(url);

      results.push({ key, url });
    }

    // Save product once after pushing all URLs
    await product.save();

    // Return array of uploaded file info
    return res.json({ uploaded: results });
  } catch (err) {
    console.error('[uploadRoutes] error:', err && err.stack ? err.stack : err);
    const details = err && err.message ? err.message : String(err);
    return res.status(500).json({ error: 'Upload failed', details });
  }
});

module.exports = router;
