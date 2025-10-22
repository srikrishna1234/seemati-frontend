// backend/app.js
require("dotenv").config(); // load backend/.env first

const express = require("express");
const path = require("path");
const cors = require("cors");

const connectDB = require("./src/db"); // your DB connector
const cartRoutes = require("./src/routes/cartRoutes");
const adminProductRouter = require("./src/routes/adminProduct");

// NEW: upload router for S3 uploads
const uploadRouter = require("./src/routes/upload");

const app = express();

/* -------------------------------------------------
   CORS: use cors package with explicit allowed headers
   - Reads FRONTEND_ORIGIN and ALLOWED_ORIGINS from env
   - Adds sensible localhost defaults for dev
   - Echoes origin when credentials allowed (required)
-------------------------------------------------- */
const buildWhitelist = () => {
  const allowed = new Set();

  if (process.env.FRONTEND_ORIGIN) allowed.add(process.env.FRONTEND_ORIGIN.trim());
  if (process.env.ALLOWED_ORIGINS) {
    process.env.ALLOWED_ORIGINS
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((s) => allowed.add(s));
  }

  // Development defaults (useful for local dev)
  allowed.add("http://localhost:3000");
  allowed.add("http://127.0.0.1:3000");

  return Array.from(allowed);
};

const whitelist = buildWhitelist();

const corsOptions = {
  origin: function (origin, callback) {
    // If no origin (curl, mobile apps, server-to-server) allow it.
    if (!origin) return callback(null, true);

    // Exact match required for credentialed requests
    if (whitelist.includes(origin)) {
      return callback(null, true);
    } else {
      // Deny unknown origins with an error (will be handled later)
      return callback(new Error(`CORS: Origin ${origin} not allowed`));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With"],
  exposedHeaders: ["Content-Length", "ETag"],
  credentials: true, // set true only if you use cookies/credentials
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // preflight for all routes

/* -------------------------------------------------
   JSON/body parsing
-------------------------------------------------- */
app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/* -------------------------------------------------
   Static files (images, uploads)
-------------------------------------------------- */
const imagesPath = path.join(__dirname, "public", "images");
console.log("Serving images from =", imagesPath);
app.use("/images", express.static(imagesPath));

const uploadsPath = path.join(__dirname, "uploads");
console.log("Serving uploads from =", uploadsPath);
app.use("/uploads", express.static(uploadsPath));

/* -------------------------------------------------
   BACKEND / SERVER URL resolution
-------------------------------------------------- */
const PORT = process.env.PORT || 4000;
const SERVER_URL = (process.env.SERVER_URL || process.env.BACKEND_URL || `http://localhost:${PORT}`).replace(/\/+$/, "");

/**
 * toAbsoluteImageUrl(img)
 * - Accepts: string ("/uploads/x.jpg" or "uploads/x.jpg" or "http://..."),
 *            object with .url or .filename
 * - Returns absolute URL string (SERVER_URL + path) or placeholder image
 */
function toAbsoluteImageUrl(img) {
  if (!img) return `${SERVER_URL}/images/placeholder.png`;

  if (typeof img === "object") {
    if (img.url) return toAbsoluteImageUrl(img.url);
    if (img.filename) return toAbsoluteImageUrl(img.filename);
  }

  const s = String(img).trim();
  if (!s) return `${SERVER_URL}/images/placeholder.png`;
  if (/^https?:\/\//i.test(s)) return s;

  // If string starts with slash, treat as absolute path on this server
  if (s.startsWith("/")) return `${SERVER_URL}${s}`;

  // If it contains uploads or images, attach safely
  if (s.includes("uploads") || s.includes("images")) {
    return `${SERVER_URL}/${s.replace(/^\/+/, "")}`;
  }

  // Fallback: treat as uploads filename
  return `${SERVER_URL}/uploads/${s.replace(/^\/+/, "")}`;
}

/* -------------------------------------------------
   Routes that must be reachable quickly:
   - Root and /api/ping must be placed BEFORE any router mounted at /api
-------------------------------------------------- */
app.get("/", (req, res) => {
  res.json({ message: "Backend is running 🎉", server: SERVER_URL });
});

app.get("/api/ping", (req, res) => res.json({ ok: true, msg: "api ping" }));
app.head("/api/ping", (req, res) => res.status(200).end());

/* -------------------------------------------------
   Routes (cart / admin / upload)
-------------------------------------------------- */
// cart routes mounted at /cart
app.use("/cart", cartRoutes);

// Admin product routes: mount explicitly under /admin-api
app.use("/admin-api", adminProductRouter);

// Upload router mounted under /api (provides /api/upload-image etc.)
app.use("/api", uploadRouter);

/* -------------------------------------------------
   Public product listing endpoints (normalized)
-------------------------------------------------- */
app.get("/products", async (req, res, next) => {
  try {
    let Product = null;
    try {
      Product = require("./src/models/Product");
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
        const normalizedImages = imgs.length ? imgs.map((it) => toAbsoluteImageUrl(it)) : [toAbsoluteImageUrl(null)];

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
        images: [`${SERVER_URL}/images/leggings.png`],
        description: "Comfortable sample leggings",
        createdAt: new Date(),
      },
    ]);
  } catch (err) {
    console.error("[app.js] GET /products error:", err && err.stack ? err.stack : err);
    return next(err);
  }
});

app.get("/admin-api/products", async (req, res, next) => {
  try {
    let Product = null;
    try {
      Product = require("./src/models/Product");
      Product = Product && (Product.default || Product);
    } catch (e) {
      Product = null;
    }

    if (Product && Product.find) {
      const list = await Product.find().lean();
      const normalized = list.map((p) => {
        const copy = { ...p };
        const imgs = Array.isArray(copy.images) ? copy.images : [];
        copy.images = imgs.length ? imgs.map((it) => toAbsoluteImageUrl(it)) : [toAbsoluteImageUrl(null)];
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
        images: [`${SERVER_URL}/images/leggings.png`],
        description: "Comfortable sample leggings",
        createdAt: new Date(),
      },
    ]);
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------
   API 404 handler for specific API-ish paths
-------------------------------------------------- */
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
   Error handler
   - Special-case CORS errors so you can see origin info in logs
-------------------------------------------------- */
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err?.message || err);
  if (err && String(err.message || "").toLowerCase().includes("cors")) {
    // Include origin info for debugging
    const origin = req.headers.origin || "no-origin";
    console.warn(`CORS blocked request from origin: ${origin} — ${err.message}`);
    return res.status(403).json({ error: "CORS blocked request", message: err.message });
  }
  res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
});

/* -------------------------------------------------
   Helper: list registered routes (prints to logs)
-------------------------------------------------- */
function listRoutes(appToList) {
  try {
    const routes = [];
    if (!appToList || !appToList._router) return;
    appToList._router.stack.forEach((middleware) => {
      if (middleware.route) {
        routes.push(middleware.route);
      } else if (middleware.name === "router" && middleware.handle && middleware.handle.stack) {
        middleware.handle.stack.forEach((handler) => {
          if (handler.route) routes.push(handler.route);
        });
      }
    });
    console.log("REGISTERED ROUTES:");
    routes.forEach((r) => {
      const methods = Object.keys(r.methods).join(",").toUpperCase();
      console.log(methods, r.path);
    });
  } catch (e) {
    console.warn("Could not list routes:", e && e.message);
  }
}

/* -------------------------------------------------
   Start server after DB connects
-------------------------------------------------- */
connectDB()
  .then(() => {
    console.log("✅ MongoDB connected (confirmed in app.js)");
    const server = app.listen(process.env.PORT || 4000, () => {
      console.log(`✅ Server running on ${SERVER_URL}`);
      // list registered routes once server is ready
      listRoutes(app);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to connect to MongoDB — server not started.");
    console.error(err);
  });

module.exports = app;
