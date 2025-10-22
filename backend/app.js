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
   🔧 CORS: flexible handling for local dev + prod
   ------------------------------------------------- */
app.use(
  cors({
    origin: function (origin, callback) {
      // allow same-origin requests (e.g., curl, server-to-server)
      if (!origin) return callback(null, true);

      // allow common local dev hosts
      if (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1")) {
        return callback(null, true);
      }

      // Allow a single FRONTEND_ORIGIN env (common) or a comma list via ALLOWED_ORIGINS
      const allowedList = [];
      if (process.env.FRONTEND_ORIGIN) allowedList.push(process.env.FRONTEND_ORIGIN.trim());
      if (process.env.ALLOWED_ORIGINS) {
        const extras = process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean);
        allowedList.push(...extras);
      }

      if (allowedList.includes(origin)) return callback(null, true);

      console.warn("❌ Blocked by CORS:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.options("*", cors());

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
   Routes
-------------------------------------------------- */
// cart routes mounted at /cart
app.use("/cart", cartRoutes);

// Admin product routes: mount explicitly under /admin-api
app.use("/admin-api", adminProductRouter);

// Upload router mounted under /api (provides /api/upload-image etc.)
app.use("/api", uploadRouter);

/* -------------------------------------------------
   BACKEND / SERVER URL resolution
   - Prefer SERVER_URL (Render env) then BACKEND_URL fallback,
     otherwise local host URL.
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
   Public product listing endpoints (normalized)
   - GET /products       -> public products (normalized image URLs)
   - GET /admin-api/products -> admin-compatible list (normalized)
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
   Root & ping for health checks
-------------------------------------------------- */
app.get("/", (req, res) => {
  res.json({ message: "Backend is running 🎉", server: SERVER_URL });
});

// ping used by uptime monitors and frontend health checks
app.get("/api/ping", (req, res) => res.json({ ok: true, msg: "api ping" }));

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
  if (err && String(err.message || "").includes("CORS")) {
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
