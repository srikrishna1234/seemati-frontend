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
   Build whitelist from env (FRONTEND_ORIGIN + ALLOWED_ORIGINS)
-------------------------------------------------- */
function buildWhitelist() {
  const allowed = new Set();

  if (process.env.FRONTEND_ORIGIN) allowed.add(process.env.FRONTEND_ORIGIN.trim());
  if (process.env.ALLOWED_ORIGINS) {
    process.env.ALLOWED_ORIGINS
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((s) => allowed.add(s));
  }

  // Local dev defaults
  allowed.add("http://localhost:3000");
  allowed.add("http://127.0.0.1:3000");

  return Array.from(allowed);
}

const whitelist = buildWhitelist();
console.log("CORS whitelist:", whitelist);

/* -------------------------------------------------
   CORS: use cors package only and configure it to:
   - echo exact origin for allowed origins
   - allow Authorization and Content-Type headers
   - NOT allow credentials (cookies) for now — we're using bearer tokens
-------------------------------------------------- */
const corsOptions = {
  origin: function (origin, callback) {
    // allow server-to-server or curl (no origin)
    if (!origin) return callback(null, true);

    // exact match required for credentialed requests and for security
    if (whitelist.includes(origin)) {
      return callback(null, true);
    }

    // not allowed: create an explicit error so the error handler logs it clearly
    return callback(new Error(`Origin ${origin} is not allowed by CORS`), false);
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
  // include 'Origin' so preflight from some clients is satisfied
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
  exposedHeaders: ["Content-Length", "ETag"],
  // IMPORTANT: we are NOT using cookies / credentials with browser requests right now.
  // Using credentials: true requires a specific origin (not '*') and the client must set withCredentials:true.
  credentials: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // let cors handle preflight for all routes

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
const SERVER_URL = (process.env.SERVER_URL || process.env.BACKEND_URL || `https://seemati-backend.onrender.com`).replace(/\/+$/, "");

/**
 * toAbsoluteImageUrl(img)
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

  if (s.startsWith("/")) return `${SERVER_URL}${s}`;
  if (s.includes("uploads") || s.includes("images")) {
    return `${SERVER_URL}/${s.replace(/^\/+/, "")}`;
  }
  return `${SERVER_URL}/uploads/${s.replace(/^\/+/, "")}`;
}

/* -------------------------------------------------
   Routes that must be reachable quickly
-------------------------------------------------- */
app.get("/", (req, res) => {
  res.json({ message: "Backend is running 🎉", server: SERVER_URL });
});

app.get("/api/ping", (req, res) => res.json({ ok: true, msg: "api ping" }));
app.head("/api/ping", (req, res) => res.status(200).end());

/* -------------------------------------------------
   Routes (cart / admin / upload)
-------------------------------------------------- */
app.use("/cart", cartRoutes);
app.use("/admin-api", adminProductRouter);
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

    // Fallback
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
    console.error("[app.js] GET /products error:", err && (err.stack || err));
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
-------------------------------------------------- */
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err?.message || err);
  if (err && String(err.message || "").toLowerCase().includes("cors")) {
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

    // Use the PORT provided by the environment (Render provides it).
    const server = app.listen(PORT, () => {
      // Log useful info: the port we actually bound to and the server URL used for generating image links.
      const boundPort = server.address && server.address().port ? server.address().port : PORT;
      console.log(`✅ Server listening on port ${boundPort}`);
      console.log(`✅ Public/server URL for images and links: ${SERVER_URL}`);
      // list registered routes once server is ready
      listRoutes(app);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to connect to MongoDB — server not started.");
    console.error(err);
  });

module.exports = app;
