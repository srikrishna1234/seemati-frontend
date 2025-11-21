// backend/src/routes/upload.cjs
'use strict';
const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '');
    cb(null, `${Date.now()}-${safe}`);
  }
});
const upload = multer({ storage });

router.post('/products/upload', upload.any(), (req, res) => {
  try {
    const files = req.files || [];
    const host = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 4000}`;
    const out = files.map(f => ({ filename: f.filename, url: `${host}/uploads/${f.filename}`, size: f.size }));
    return res.json(out);
  } catch (err) {
    console.error('[upload] error:', err && (err.stack || err));
    return res.status(500).json({ ok: false, message: 'upload failed' });
  }
});

module.exports = router;
