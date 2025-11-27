// backend/src/middleware/serveruploads.js
'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');

const router = express.Router();

// FRONTEND_ORIGIN: exact origin that will load images.
// You can also set this via environment var FRONTEND_URL (preferred).
const FRONTEND_ORIGIN = process.env.FRONTEND_URL || process.env.FRONTEND_ORIGINS || 'https://seemati.in';

// uploadsDir: adjust if your uploads folder is elsewhere.
// This points to backend/uploads (two levels up from this file).
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

// Helper to safely build path (prevents path traversal)
function getSafeFilePath(filename) {
  // Disallow '../' or null bytes
  if (!filename || typeof filename !== 'string' || filename.includes('\0')) return null;

  // Normalize and join
  const filePath = path.join(uploadsDir, filename);
  const normalized = path.normalize(filePath);
  const allowed = path.normalize(uploadsDir) + path.sep;

  if (!normalized.startsWith(allowed) && normalized !== path.normalize(uploadsDir)) {
    return null;
  }
  return normalized;
}

// Route: GET /uploads/:filename
router.get('/uploads/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    if (!filename) return res.status(400).send('Filename required');

    const filePath = getSafeFilePath(filename);
    if (!filePath) return res.status(400).send('Invalid file path');

    if (!fs.existsSync(filePath)) return res.status(404).send('Not found');

    // Determine content-type
    const contentType = mime.lookup(filePath) || 'application/octet-stream';

    // Set headers to allow cross-origin image use from frontend
    // If you send cookies when loading images, set Access-Control-Allow-Credentials: true and ensure FRONTEND_ORIGIN is exact.
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', FRONTEND_ORIGIN);
    // Uncomment below if your frontend sends cookies when fetching images:
    // res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Prevent same-origin blocking for resource embedding
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    // Security hints
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Caching for performance (adjust TTL as needed)
    res.setHeader('Cache-Control', 'public, max-age=86400');

    // Stream the file
    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      console.error('[Uploads] Stream error for', filePath, err);
      if (!res.headersSent) res.status(500).end();
    });
    stream.pipe(res);
  } catch (err) {
    console.error('[Uploads] Unexpected error', err);
    return res.status(500).send('Server error');
  }
});

module.exports = router;
