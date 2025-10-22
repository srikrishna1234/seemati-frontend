<<<<<<< HEAD
﻿// backend/app.js
// Full replacement — minimal bootstrap that loads env and starts app.cjs
'use strict';

const path = require('path');

(function bootstrap() {
  try {
    // Load dotenv from backend/.env if present (non-fatal)
    try {
      require('dotenv').config({ path: path.join(__dirname, '.env') });
    } catch (e) {
      // optional; ignore if missing
    }

    // Prefer to load app.cjs (CommonJS server entry). If app.cjs missing, try app.js fallback.
    const candidates = [
      path.join(__dirname, 'app.cjs'),
      path.join(__dirname, 'app.js'), // fallback only if app.cjs absent
    ];

    let loaded = false;
    for (const entry of candidates) {
      try {
        // Only require the first existing file that's not this wrapper
        const fs = require('fs');
        if (fs.existsSync(entry) && path.resolve(entry) !== __filename) {
          console.log(`[bootstrap] Loading CommonJS entry: ${entry}`);
          require(entry);
          loaded = true;
          break;
        }
      } catch (e) {
        // try next candidate
      }
    }

    if (!loaded) {
      // Last-resort: try requiring './src/server.js' if project uses ESM transpile or hybrid setups.
      try {
        const alt = path.join(__dirname, 'src', 'server.js');
        console.log(`[bootstrap] Trying fallback entry: ${alt}`);
        require(alt);
        loaded = true;
      } catch (e) {
        // ignore
      }
    }

    if (!loaded) {
      console.error('[bootstrap] No server entry found (app.cjs / app.js / src/server.js). Exiting.');
      process.exit(1);
    }
=======
// backend/app.js
require("dotenv").config(); // load backend/.env first

const express = require("express");
const cors = require("cors");
const path = require("path");

const connectDB = require("./src/db"); // your DB connector
const cartRoutes = require("./src/routes/cartRoutes");
const adminProductRouter = require("./src/routes/adminProduct");

// NEW: upload router for S3 uploads
const uploadRouter = require("./src/routes/upload");

const app = express();

/* -------------------------------------------------
   🔧 UNIVERSAL CORS FIX (for local dev and builds)
   -------------------------------------------------
   - Echoes any local origin automatically.
   - Allows credentials (cookies, auth tokens).
-------------------------------------------------- */
app.use(
  cors({
    origin: function (origin, callback) {
      // allow same-origin requests (e.g., curl, server-to-server)
      if (!origin) return callback(null, true);
      // allow common local dev hosts
      if (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1")) {
        return callback(null, true);
      }
      // allow your deployed frontend origin(s) by reading env var if provided
      const allowed = (process.env.ALLOWED_ORIGINS || "")
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);
      if (allowed.includes(origin)) return callback(null, true);

      console.log("❌ Blocked by CORS:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.options("*", cors());

// JSON & URL encoding
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* -------------------------------------------------
   📁 Static files (images, uploads)
   -------------------------------------------------
   Keep these in place for local fallback/static assets.
   Your uploaded product images will go to S3, but these
   routes are helpful for placeholder images and legacy usage.
-------------------------------------------------- */
const imagesPath = path.join(__dirname, "public", "images");
console.log("Serving images from =", imagesPath);
app.use("/images", express.static(imagesPath));

const uploadsPath = path.join(__dirname, "uploads");
console.log("Serving uploads from =", uploadsPath);
app.use("/uploads", express.static(uploadsPath));

/* -------------------------------------------------
   📦 Routes (admin / cart / upload)
-------------------------------------------------- */
// existing app routes
app.use("/cart", cartRoutes);
app.use(adminProductRouter); // mounts routes such as /admin/products and /products/upload

// NEW: mount upload routes under /api (provides /api/upload-image and /api/image-url)
app.use("/api", uploadRouter);

/* -------------------------------------------------
   🔁 BACKEND_URL and image normalization helper
   -------------------------------------------------
   - Use BACKEND_URL env var in production (e.g. https://seemati-backend.onrender.com)
   - Defaults to http://localhost:<PORT> for local dev
-------------------------------------------------- */
const PORT = process.env.PORT || 4000;
const BACKEND_URL = (process.env.BACKEND_URL || `http://localhost:${PORT}`).replace(/\/+$/, "");

/**
 * toAbsoluteImageUrl(img)
 * - Accepts: string ("/uploads/x.jpg" or "uploads/x.jpg" or "http://..."),
 *            object with .url or .filename
 * - Returns absolute URL string (BACKEND_URL + path) or placeholder image
 */
function toAbsoluteImageUrl(img) {
  if (!img) return `${BACKEND_URL}/images/placeholder.png`;

  if (typeof img === "object") {
    if (img.url) return toAbsoluteImageUrl(img.url);
    if (img.filename) return toAbsoluteImageUrl(img.filename);
  }

  const s = String(img).trim();
  if (!s) return `${BACKEND_URL}/images/placeholder.png`;
  if (/^https?:\/\//i.test(s)) return s;

  // If string starts with slash, treat as absolute path on this server
  if (s.startsWith("/")) return `${BACKEND_URL}${s}`;

  // If it contains uploads or images, attach safely
  if (s.includes("uploads") || s.includes("images")) {
    return `${BACKEND_URL}/${s.replace(/^\/+/, "")}`;
  }

  // Fallback: treat as uploads filename
  return `${BACKEND_URL}/uploads/${s.replace(/^\/+/, "")}`;
}

/* -------------------------------------------------
   ✅ Public GET /products  (returns normalized products)
-------------------------------------------------- */
app.get("/products", async (req, res, next) => {
  try {
    let Product = null;
    try {
      Product = require("./models/Product");
      Product = Product && (Product.default || Product);
    } catch (e) {
      Product = null;
    }

    if (Product && Product.find) {
      const filter = { deleted: { $ne: true } };
      if (req.query.category) filter.category = String(req.query.category);

      const items = await Product.find(filter).sort({ createdAt: -1 }).lean().exec();

      const normalized = items.map((p) => {
        const copy = { ...p };

        const imgs = Array.isArray(copy.images) ? copy.images : [];
        const normalizedImages = imgs.length
          ? imgs.map((it) => toAbsoluteImageUrl(it))
          : [toAbsoluteImageUrl(null)];

        copy.images = normalizedImages;
        copy.image = copy.image ? toAbsoluteImageUrl(copy.image) : normalizedImages[0];

        return copy;
      });

      return res.json(normalized);
    }

    // Fallback (if Product model missing)
    return res.json([
      {
        title: "Sample Leggings",
        name: "Leggings",
        price: 299,
        images: [`${BACKEND_URL}/images/leggings.png`],
        description: "Comfortable sample leggings",
        createdAt: new Date(),
      },
    ]);
  } catch (err) {
    console.error("[app.js] GET /products error:", err && err.stack ? err.stack : err);
    return next(err);
  }
});

/* -------------------------------------------------
   ✅ Compatibility for /admin-api/products (frontend older path)
-------------------------------------------------- */
app.get("/admin-api/products", async (req, res, next) => {
  try {
    let Product = null;
    try {
      Product = require("./models/Product");
      Product = Product && (Product.default || Product);
    } catch (e) {
      Product = null;
    }

    if (Product && Product.find) {
      const list = await Product.find().lean();
      const normalized = list.map(p => {
        const copy = { ...p };
        const imgs = Array.isArray(copy.images) ? copy.images : [];
        copy.images = imgs.length ? imgs.map(it => toAbsoluteImageUrl(it)) : [toAbsoluteImageUrl(null)];
        copy.image = copy.image ? toAbsoluteImageUrl(copy.image) : copy.images[0];
        return copy;
      });
      return res.json(normalized);
    }

    // fallback sample
    return res.json([
      {
        title: "Sample Leggings",
        name: "Leggings",
        price: 299,
        images: [`${BACKEND_URL}/images/leggings.png`],
        description: "Comfortable sample leggings",
        createdAt: new Date(),
      },
    ]);
>>>>>>> efe0eb3 (Ready for deploy: Seemati frontend final build)
  } catch (err) {
    console.error('[bootstrap] Fatal error starting backend:', err && (err.stack || err));
    process.exit(1);
  }
<<<<<<< HEAD
})();
=======
});

/* -------------------------------------------------
   🌐 Root health-check
-------------------------------------------------- */
app.get("/", (req, res) => {
  res.json({ message: "Backend is running 🎉" });
});

/* -------------------------------------------------
   🧩 404 handler for API routes
-------------------------------------------------- */
app.get('/api/ping', (req, res) => res.json({ ok: true, msg: 'api ping' }));
app.use((req, res, next) => {
  if (
    req.path.startsWith("/api") ||
    req.path.startsWith("/admin") ||
    req.path.startsWith("/cart") ||
    req.path.startsWith("/images") ||
    req.path.startsWith("/uploads")
  ) {
    return res.status(404).json({ error: "Not Found", path: req.path });
  }
  next();
});

/* -------------------------------------------------
   🚨 Error handler
-------------------------------------------------- */
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err?.message || err);
  if (err && String(err.message || "").includes("CORS")) {
    return res.status(403).json({ error: "CORS blocked request", message: err.message });
  }
  res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
});

/* -------------------------------------------------
   🚀 Start server after DB connects
-------------------------------------------------- */
connectDB()
  .then(() => {
    console.log("✅ MongoDB connected (confirmed in app.js)");
    app.listen(PORT, () => {
      console.log(`✅ Server running on ${BACKEND_URL}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to connect to MongoDB — server not started.");
    console.error(err);
  });

module.exports = app;
>>>>>>> efe0eb3 (Ready for deploy: Seemati frontend final build)
