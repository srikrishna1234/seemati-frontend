// backend/src/routes/uploadRoutes.cjs
// Simple local upload handler for admin UI
// - Accepts POST /upload (multipart form-data, field name: images[] or images)
// - Stores files into backend/uploads/
// - Returns JSON: { success:true, files: [{ url, key }] }
// NOTE: This is a local-storage fallback. For production S3, replace with AWS SDK logic.

const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const router = express.Router();

// ensure uploads dir exists
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch (e) { console.warn('Could not create uploads dir:', e); }
}

// multer storage to uploads folder with timestamped filenames
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // sanitize originalname a little
    const safeName = file.originalname.replace(/\s+/g, '_').replace(/[^\w.-]/g, '');
    const finalName = `${Date.now()}_${Math.round(Math.random()*1e6)}_${safeName}`;
    cb(null, finalName);
  }
});
const upload = multer({ storage });

// POST /upload
// Accept single or multiple files in field 'images' (or 'image')
router.post('/upload', upload.array('images'), async (req, res) => {
  try {
    const files = req.files || [];
    const host = process.env.PUBLIC_API_ORIGIN || ''; // optional for full URL
    // Build response files with url & key
    const out = files.map(f => {
      // url: return absolute path if PUBLIC_API_ORIGIN set, else return /uploads/...
      const relative = `/uploads/${f.filename}`;
      const url = host ? `${host}${relative}` : relative;
      return { url, key: f.filename };
    });

    return res.json({ success: true, files: out });
  } catch (err) {
    console.error('[uploadRoutes] upload error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, message: err && err.message ? err.message : 'Upload failed' });
  }
});

module.exports = router;
