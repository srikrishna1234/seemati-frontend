// backend/src/routes/uploadRoutes.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Upload directory: backend/uploads
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ts = Date.now();
    const safeName = (file.originalname || 'file').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.\-_]/g, '');
    cb(null, `${ts}-${safeName}`);
  }
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

// Accept any multipart field name (dev-friendly)
router.post('/upload', upload.any(), (req, res) => {
  try {
    const host = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 4000}`;
    const out = (req.files || []).map((f) => ({
      filename: f.filename,
      originalname: f.originalname,
      url: `${host}/uploads/${f.filename}`,
      size: f.size,
    }));
    return res.json(out);
  } catch (err) {
    console.error('upload error', err);
    return res.status(500).json({ error: 'Upload failed', details: String(err) });
  }
});

module.exports = router;
