// backend/src/routes/debugListUploads.js
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * GET /api/debug/list-uploads
 * Returns list of files (first 500) inside the server's uploads directory.
 * Temporary debug-only endpoint: remove after use.
 */
router.get("/debug/list-uploads", (req, res) => {
  try {
    // uploads path relative to backend/src
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

export default router;
