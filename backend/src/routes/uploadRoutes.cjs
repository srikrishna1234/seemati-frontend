// backend/src/routes/uploadRoutes.cjs
// CommonJS route file for product image upload (PUT /api/products/:id/upload)
// Replaces previous file that used ACL: 'public-read' which fails for "Bucket owner enforced".

const express = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { randomUUID } = require('crypto');

const router = express.Router();

// Adjust this path to your Product model if needed:
const Product = require('../../models/Product'); // <-- ensure this path is correct

// Multer: memory storage (we upload from memory to S3)
const upload = multer({ storage: multer.memoryStorage() });

// Configure S3 client (reads region from env)
const s3 = new S3Client({ region: process.env.AWS_REGION });

// Helper to build public URL for object (if you use path-style or custom domain change accordingly)
function s3ObjectUrl(bucket, region, key) {
  // For standard AWS S3 URL
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

// PUT /api/products/:id/upload
// Expects multipart form-data with field name "image"
router.put('/:id/upload', upload.single('image'), async (req, res) => {
  try {
    const productId = req.params.id;

    // Basic validation
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Ensure product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Build S3 key
    const key = `products/${Date.now()}-${randomUUID()}-${req.file.originalname}`;

    // PutObjectCommand params - IMPORTANT: DO NOT set ACL here (Bucket owner enforced forbids ACL)
    const putParams = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      // ACL: 'public-read'   <-- removed on purpose
    };

    // Upload to S3
    await s3.send(new PutObjectCommand(putParams));

    // Build URL (or use CloudFront domain if you have one)
    const url = s3ObjectUrl(process.env.S3_BUCKET_NAME, process.env.AWS_REGION, key);

    // Save key+url to product.images (adjust field name/schema to match your model)
    product.images = product.images || [];
    product.images.push({ key, url });
    await product.save();

    return res.json({ key, url });
  } catch (err) {
    // Log full error for Render logs
    console.error('[uploadRoutes] S3 upload error:', err && err.stack ? err.stack : err);

    // If S3 returned a structured error, include message so front-end sees details
    const details = err && err.message ? err.message : String(err);
    return res.status(500).json({ error: 'Upload failed', details });
  }
});

module.exports = router;
