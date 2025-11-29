// backend/src/routes/uploadRoutes.cjs
// Upload route (PUT /api/products/:id/upload)
// Accepts any single file field (multer.any()), uploads to S3 (no ACL), saves URL string to product.images
// Returns { key, url } to frontend.

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
    fileSize: 20 * 1024 * 1024 // 20 MB limit (adjust if needed)
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
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Use the first file only
    const file = files[0];

    // Optional validation: mime types
    // const allowed = ['image/jpeg','image/png','image/webp','image/svg+xml'];
    // if (!allowed.includes(file.mimetype)) return res.status(400).json({ error: 'Invalid file type' });

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
      // no ACL — works with "Bucket owner enforced"
    };

    // Upload to S3
    await s3.send(new PutObjectCommand(putParams));

    const url = s3ObjectUrl(process.env.S3_BUCKET_NAME, process.env.AWS_REGION, key);

    // IMPORTANT: store a STRING in DB (existing schema expects strings)
    // We'll store the URL string so old frontend and static paths work.
    product.images = product.images || [];
    product.images.push(url);            // <-- push the string (not an object)
    await product.save();

    // Respond with object so frontend has both key and url immediately
    return res.json({ key, url });
  } catch (err) {
    // Log for Render
    console.error('[uploadRoutes] error:', err && err.stack ? err.stack : err);
    const details = err && err.message ? err.message : String(err);
    return res.status(500).json({ error: 'Upload failed', details });
  }
});

module.exports = router;
