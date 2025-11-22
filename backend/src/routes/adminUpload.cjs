// backend/src/routes/adminUpload.cjs
'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const multer = require('multer');

const router = express.Router();

// ensure uploads folder exists (relative to backend root)
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// multer storage -> backend/uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // keep original name with timestamp prefix
    const safe = file.originalname.replace(/\s+/g, '_');
    const name = `${Date.now()}-${safe}`;
    cb(null, name);
  }
});
const upload = multer({ storage });

/**
 * POST /  (mounted at /admin-api/products/upload)
 * Accepts form field "image"
 */
router.post('/', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'no file uploaded (field must be "image")' });
    }

    // public URL served by express static (http://localhost:4000/uploads/filename)
    const filename = req.file.filename;
    const publicUrl = `${req.protocol}://${req.get('host')}/uploads/${encodeURIComponent(filename)}`;

    const result = {
      ok: true,
      file: {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        filename,
        size: req.file.size,
        path: req.file.path,
        url: publicUrl
      }
    };

    return res.json(result);
  } catch (err) {
    console.error('adminUpload error:', err.stack || err);
    return res.status(500).json({ ok: false, error: 'upload failed', details: err.message });
  }
});

module.exports = router;
