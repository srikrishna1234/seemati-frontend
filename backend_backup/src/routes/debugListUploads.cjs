// backend/src/routes/debugListUploads.cjs
const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

/**
 * GET /api/debug/list-uploads
 * Returns list of files (first 500) inside the server's uploads directory.
 * Temporary debug-only endpoint: remove after use.
 */
router.get("/debug/list-uploads", (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, "..", "..", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      return res.json({ ok: true, count: 0, files: [] });
    }
    const files = fs.readdirSync(uploadsDir).slice(0, 500);
    return res.json({ ok: true, count: files.length, files });
  } catch (err) {
    console.error("[debugListUploads] error:", err && (err.stack || err));
    return res.status(500).json({ ok: false, error: String(err.message || err) });
  }
});

module.exports = router;
