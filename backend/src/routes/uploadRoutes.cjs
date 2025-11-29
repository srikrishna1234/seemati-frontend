// backend/src/routes/uploadRoutes.cjs
// Upload route (PUT /api/products/:id/upload)
// Accepts any single file field (multer.any()), uploads to S3 (no ACL), saves {key,url} to product.

const express = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { randomUUID } = require('crypto');

const router = express.Router();
const Product = require('../models/product.cjs'); // correct relative path

// Multer memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB limit (adjust if you need)
  }
});

// S3 client
const s3 = new S3Client({ region: process.env.AWS_REGION });

function s3ObjectUrl(bucket, region, key) {
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

// PUT /api/products/:id/upload
// Accepts multipart/form-data with any file field. We take the first file only.
router.put('/:id/upload', upload.any(), async (req, res) => {
  try {
    const productId = req.params.id;

    // Multer puts files in req.files when using .any()
    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Use only the first uploaded file
    const file = files[0];

    // Optional: validate mimetype (uncomment if you want to restrict types)
    // const allowed = ['image/jpeg','image/png','image/webp','image/svg+xml'];
    // if (!allowed.includes(file.mimetype)) {
    //   return res.status(400).json({ error: 'Invalid file type' });
    // }

    // Ensure product exists
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Build S3 key
    const key = `products/${Date.now()}-${randomUUID()}-${file.originalname}`;

    const putParams = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype
      // intentionally no ACL for Bucket owner enforced
    };

    await s3.send(new PutObjectCommand(putParams));

    const url = s3ObjectUrl(process.env.S3_BUCKET_NAME, process.env.AWS_REGION, key);

    product.images = product.images || [];
    product.images.push({ key, url });
    await product.save();

    return res.json({ key, url });
  } catch (err) {
    // Multer errors sometimes bubble here (e.g. fileSize), log clearly
    console.error('[uploadRoutes] error:', err && err.stack ? err.stack : err);
    const details = err && err.message ? err.message : String(err);
    return res.status(500).json({ error: 'Upload failed', details });
  }
});

module.exports = router;
