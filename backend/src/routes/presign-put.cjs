/**
 * backend/src/routes/presign-put.cjs
 * Returns a presigned PUT URL for a given S3 key.
 * GET /api/presign-put?key=path/to/object.png&expires=300&contentType=image/png
 * Response: { ok: true, url: "...", publicUrl: "https://{bucket}.s3.{region}.amazonaws.com/{key}" }
 */
const express = require('express');
const router = express.Router();

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const S3_BUCKET = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET || null;
const AWS_REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || null;

if (!S3_BUCKET || !AWS_REGION) {
  console.warn('[presign-put] S3_BUCKET or AWS_REGION not configured — presign-put endpoint will return 501.');
}

const s3Client = new S3Client({
  region: AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

// GET /api/presign-put?key=uploads/file.png&expires=300&contentType=image/png
router.get('/', async (req, res) => {
  try {
    if (!S3_BUCKET || !AWS_REGION) {
      return res.status(501).json({ ok: false, message: 'S3 not configured' });
    }

    const key = req.query.key;
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ ok: false, message: 'missing key query parameter' });
    }

    // optional content type
    const contentType = req.query.contentType || undefined;

    // optional expires (seconds)
    let expires = parseInt(String(req.query.expires || '300'), 10);
    if (Number.isNaN(expires) || expires <= 0) expires = 300;
    if (expires > 3600) expires = 3600;

    const commandParams = {
      Bucket: S3_BUCKET,
      Key: key
    };
    if (contentType) commandParams.ContentType = contentType;

    const cmd = new PutObjectCommand(commandParams);

    const url = await getSignedUrl(s3Client, cmd, { expiresIn: expires });

    // predictable public URL (works if objects are served publicly or via CloudFront)
    const publicUrl = `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${encodeURIComponent(key)}`;

    return res.json({ ok: true, url, publicUrl, expiresIn: expires });
  } catch (err) {
    console.error('[presign-put] error:', err && (err.stack || err));
    return res.status(500).json({ ok: false, message: 'presign-put failed', details: err.message });
  }
});

module.exports = router;
