// backend/src/routes/uploadRoutes.cjs
const express = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');

const router = express.Router();

// Use memory storage so files do not touch instance disk
const upload = multer({ storage: multer.memoryStorage() });

// Configure S3 client using env vars
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

function getS3Key(filename) {
  // Put all product uploads under products/ prefix with timestamp to avoid collisions
  const ts = Date.now();
  const safe = filename.replace(/\s+/g, '-');
  return `products/${ts}-${safe}`;
}

function s3PublicUrl(key) {
  // prefer S3_BASE_URL if provided
  const base = process.env.S3_BASE_URL || `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`;
  return `${base}/${encodeURIComponent(key)}`;
}

// Route: PUT /api/products/:id/upload
// Accepts form field "images" (multiple)
router.put('/api/products/:id/upload', upload.array('images'), async (req, res) => {
  try {
    const files = req.files || [];
    const bucket = process.env.S3_BUCKET_NAME;
    if (!bucket) return res.status(500).json({ error: 'S3 bucket not configured' });

    const uploaded = [];

    for (const f of files) {
      const originalName = f.originalname || 'file';
      const key = getS3Key(originalName);
      const params = {
        Bucket: bucket,
        Key: key,
        Body: f.buffer,
        ContentType: f.mimetype || 'application/octet-stream',
        ACL: 'public-read'
      };
      await s3.send(new PutObjectCommand(params));
      uploaded.push(s3PublicUrl(key));
    }

    // Respond with array of URLs
    return res.json({ images: uploaded });
  } catch (err) {
    console.error('Upload error', err);
    return res.status(500).json({ error: 'Upload failed', details: String(err) });
  }
});

module.exports = router;
