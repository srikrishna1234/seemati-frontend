// server.js
require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();

// ✅ CORS: allow frontend origin + cookies
app.use(cors({
  origin: "http://localhost:3000", // frontend dev server
  credentials: true,               // allow cookies
}));

app.use(express.json());
app.use(cookieParser());

const PORT = process.env.PORT || 4000;
const DB_FILE = path.join(__dirname, "carts.json");

// ensure carts.json exists
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({}), "utf8");
}

// helper: read/write
function readDB() {
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(raw || "{}");
  } catch (e) {
    console.error("Failed to read carts.json:", e);
    return {};
  }
}
function writeDB(obj) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(obj, null, 2), "utf8");
    return true;
  } catch (e) {
    console.error("Failed to write carts.json:", e);
    return false;
  }
}

// --- Cart API (demo) ---
app.get("/api/cart", (req, res) => {
  const uid = req.query.uid;
  if (!uid) return res.status(400).json({ error: "uid required" });

  const db = readDB();
  const cart = db[uid] || {};
  res.json({ uid, cart });
});

app.post("/api/cart", (req, res) => {
  const { uid, cart } = req.body || {};
  if (!uid) return res.status(400).json({ error: "uid required" });
  if (typeof cart !== "object") return res.status(400).json({ error: "cart required" });

  const db = readDB();
  db[uid] = cart;
  const ok = writeDB(db);
  if (!ok) return res.status(500).json({ error: "failed to save" });
  res.json({ ok: true });
});

// --- Healthcheck ---
app.get("/api/ping", (_, res) => res.json({ ok: true, now: Date.now() }));

// --- Start server ---
app.listen(PORT, () => {
  console.log(`🚀 Cart API server listening on http://localhost:${PORT}`);
});
