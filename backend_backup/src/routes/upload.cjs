// backend/src/routes/upload.cjs
const express = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config();

console.log('[UploadRouter] loaded from backend/src/routes/upload.cjs');

const router = express.Router();

// multer to store file in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit â€” change as needed
});

// validate required env (log if missing but allow for local testing)
const required = ['AWS_REGION', 'AWS_S3_BUCKET', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];
for (const k of required) {
  if (!process.env[k]) {
    console.warn(`[UploadRouter] Missing env var: ${k}`);
  }
}

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

/**
 * adminAuthMiddleware
 * - Accepts Authorization: Bearer <ADMIN_TOKEN>  OR
 * - Accepts Authorization: Bearer <JWT> verified with JWT_SECRET
 */
function adminAuthMiddleware(req, res, next) {
  const auth = (req.headers.authorization || "").trim();
  if (!auth) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  const parts = auth.split(/\s+/);
  if (parts.length !== 2 || !/^Bearer$/i.test(parts[0])) {
    return res.status(401).json({ error: "Invalid Authorization header format" });
  }

  const token = parts[1];

  // Direct ADMIN_TOKEN match (dev convenience)
  if (process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN) {
    return next();
  }

  // JWT verification fallback
  if (process.env.JWT_SECRET) {
    try {
      jwt.verify(token, process.env.JWT_SECRET);
      return next();
    } catch (err) {
      console.warn('[UploadRouter] JWT verify failed:', err && err.message ? err.message : err);
      return res.status(401).json({ error: "Invalid token" });
    }
  }

  // No valid auth available
  return res.status(401).json({ error: "Unauthorized" });
}

/**
 * POST /api/upload-image
 * - Protected by adminAuthMiddleware
 * - Accepts multipart form-data with field "file"
 * - Uploads to S3 (private)
 * - Returns JSON: { key, url } where url is a presigned GET URL (valid for 5 minutes)
 */
router.post('/upload-image', adminAuthMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const ext = path.extname(req.file.originalname) || '';
    const filename = `${uuidv4()}${ext}`;
    const key = `products/${filename}`;

    const putParams = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype // keep content-type
      // DO NOT set ACL: 'public-read' because bucket blocks public access
    };

    await s3.send(new PutObjectCommand(putParams));

    // generate presigned GET so the client can display the image
    const getCommand = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key
    });
    const url = await getSignedUrl(s3, getCommand, { expiresIn: 60 * 5 }); // 5 minutes

    return res.json({ key, url });
  } catch (err) {
    console.error('[UploadRouter] Upload error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: 'Upload failed', message: err.message });
  }
});

/**
 * GET /api/image-url?key=products/xxx.jpg
 * - Protected by adminAuthMiddleware
 * - Returns a presigned GET for an existing key
 */
router.get('/image-url', adminAuthMiddleware, async (req, res) => {
  try {
    const { key } = req.query;
    if (!key) return res.status(400).json({ error: 'Missing key' });

    const getCommand = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key
    });
    const url = await getSignedUrl(s3, getCommand, { expiresIn: 60 * 5 }); // 5 minutes
    return res.json({ url });
  } catch (err) {
    console.error('[UploadRouter] Presign error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: 'Could not generate URL', message: err.message });
  }
});

module.exports = router;
