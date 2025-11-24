// backend/src/routes/presign-get.cjs
// CommonJS Express router that returns a presigned GET URL for an S3 key.
// Expects environment variables:
//   AWS_REGION, S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
// Usage:
//  GET /api/presign?key=<object-key>&expires=300
//  Response: { ok: true, url: "https://..." }

const express = require('express');
const router = express.Router();

const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const S3_BUCKET = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET || null;
const AWS_REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || null;

if (!S3_BUCKET || !AWS_REGION) {
  console.warn('[presign] S3_BUCKET or AWS_REGION not configured — presign endpoint will return 501.');
}

const s3Client = new S3Client({
  region: AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

// GET /api/presign?key=path/to/object.png&expires=300
router.get('/', async (req, res) => {
  try {
    if (!S3_BUCKET || !AWS_REGION) {
      return res.status(501).json({ ok: false, message: 'S3 not configured' });
    }

    const key = req.query.key;
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ ok: false, message: 'missing key query parameter' });
    }

    // optional expires (seconds)
    let expires = parseInt(String(req.query.expires || '300'), 10);
    if (Number.isNaN(expires) || expires <= 0) expires = 300; // default 5 minutes
    if (expires > 3600) expires = 3600; // cap at 1 hour

    const cmd = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key
    });

    const url = await getSignedUrl(s3Client, cmd, { expiresIn: expires });

    return res.json({ ok: true, url, expiresIn: expires });
  } catch (err) {
    console.error('[presign] error:', err && (err.stack || err));
    return res.status(500).json({ ok: false, message: 'presign failed' });
  }
});

module.exports = router;
