// backend/src/server.js
// Full server entry (ESM).
// - connects to MongoDB
// - serves uploads
// - mounts product and admin product routes
// - includes request logger + route lister for debugging

import express from "express";
import cors from "cors";
import session from "express-session";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import multer from "multer";
import { createRequire } from "module";
import jwt from "jsonwebtoken";

dotenv.config();

// __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// For compatibility: allow requiring CommonJS modules if needed
const require = createRequire(import.meta.url);

// Try to import Product as ES module default; if that fails, fall back to require()
let Product;
try {
  const mod = await import("../models/Product.js");
  Product = mod.default || mod.Product || mod;
} catch (err) {
  try {
    Product = require("../models/Product.js");
    Product = Product.default || Product;
  } catch (err2) {
    console.error("Failed to load Product model via import or require:", err, err2);
    Product = null;
  }
}

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || "";
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3000";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || null;
const JWT_SECRET = process.env.JWT_SECRET || null;

async function main() {
  // connect to mongo
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
  }

  const app = express();

  // --- Request logger ---
  app.use((req, res, next) => {
    console.log(`[INCOMING] ${req.method} ${req.originalUrl}`);
    next();
  });

  // CORS
  app.use(
    cors({
      origin: FRONTEND_ORIGIN,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    })
  );
  app.options("*", cors({ origin: FRONTEND_ORIGIN, credentials: true }));

  // session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "keyboard_cat_dev_secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        sameSite: "none",
        secure: false,
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24,
      },
    })
  );

  // body parsers
  app.use(express.json({ limit: "8mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // cookie parser
  const cookieParser = require("cookie-parser");
  app.use(cookieParser());

  // static uploads folder
  const uploadDir = path.join(__dirname, "..", "uploads");
  if (!fs.existsSync(uploadDir)) {
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
    } catch (e) {
      console.warn("Could not create uploads dir:", e);
    }
  }
  app.use("/uploads", express.static(uploadDir));

  // multer setup (disk storage)
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const ts = Date.now();
      const safe = file.originalname.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "");
      cb(null, `${ts}-${safe}`);
    },
  });
  const upload = multer({ storage });

  if (!Product) {
    console.warn("⚠️ Product model not loaded. Routes will fail until model is fixed.");
  }

  // -------------------------
  // Route loader (ESM-friendly)
  // -------------------------
  async function loadRoute(modulePath) {
    try {
      const mod = await import(modulePath);
      return mod.default || mod;
    } catch (impErr) {
      try {
        const mod = require(modulePath);
        return mod.default || mod;
      } catch (reqErr) {
        // prefer the import error for debugging
        throw impErr;
      }
    }
  }

  // -------------------------
  // Load routes
  // -------------------------
  let orderRoutes = null;
  let authRoutes = null;
  let otpRoutes = null;
  let protectedRoutes = null;
  let productRoutes = null;
  let adminProductRoutes = null;

  try {
    orderRoutes = await loadRoute("./routes/orders.cjs");
  } catch (e) {
    console.warn("orders route not found:", e && e.message ? e.message : e);
  }

  try {
    authRoutes = await loadRoute("./routes/auth.cjs");
  } catch (e) {
    console.warn("auth route not found:", e && e.message ? e.message : e);
  }

  try {
    otpRoutes = await loadRoute("./routes/otpRoutes.cjs");
  } catch (e) {
    console.warn("otp route not found:", e && e.message ? e.message : e);
  }

  try {
    protectedRoutes = await loadRoute("./routes/protectedRoutes.cjs");
  } catch (e) {
    console.warn("protected route not found:", e && e.message ? e.message : e);
  }

  // product routes (prefer .cjs)
  try {
    try {
      productRoutes = await loadRoute("./routes/productRoutes.cjs");
      console.log("✅ Loaded productRoutes.cjs");
    } catch (e1) {
      productRoutes = await loadRoute("./routes/productRoutes.js");
      console.log("✅ Loaded productRoutes.js (fallback)");
    }
  } catch (e) {
    console.warn("product routes not found (productRoutes.js/cjs):", e && e.message ? e.message : e);
  }

  // admin product routes
  try {
    try {
      adminProductRoutes = await loadRoute("./routes/adminProduct.js");
    } catch (e1) {
      adminProductRoutes = await loadRoute("./routes/adminProduct.cjs");
    }
  } catch (e) {
    console.warn("adminProduct route not found (adminProduct.js/cjs):", e && e.message ? e.message : e);
  }

  // -------------------------
  // Simple admin auth helper
  // Accepts either:
  //  - Bearer JWT signed with JWT_SECRET (if configured), or
  //  - Bearer token equal to ADMIN_TOKEN (if configured)
  // -------------------------
  function checkAdminAuth(req) {
    const auth = req.headers && req.headers.authorization ? String(req.headers.authorization) : "";
    if (!auth) return false;
    const parts = auth.split(/\s+/);
    if (parts.length !== 2) return false;
    const [scheme, token] = parts;
    if (!/^Bearer$/i.test(scheme)) return false;

    // Direct ADMIN_TOKEN match (simple dev fallback)
    if (ADMIN_TOKEN && token === ADMIN_TOKEN) return true;

    // JWT verification
    if (JWT_SECRET) {
      try {
        const payload = jwt.verify(token, JWT_SECRET);
        // optionally add more checks here
        return !!payload;
      } catch (e) {
        return false;
      }
    }

    return false;
  }

  // -------------------------
  // Ensure /admin-api/products/upload exists (multer file upload)
  // This prevents 404s when admin upload is called directly from frontend.
  // -------------------------
  app.post("/admin-api/products/upload", upload.single("file"), (req, res) => {
    try {
      if (!checkAdminAuth(req)) {
        return res.status(401).json({ ok: false, message: "Unauthorized" });
      }
      if (!req.file) return res.status(400).json({ ok: false, message: "No file uploaded" });
      const filename = req.file.filename;
      const url = `/uploads/${filename}`;
      console.log("[admin-upload] Uploaded:", filename);
      return res.json({ ok: true, filename, url });
    } catch (err) {
      console.error("[admin-upload] error:", err && err.stack ? err.stack : err);
      return res.status(500).json({ ok: false, message: "Upload failed" });
    }
  });

  // Also allow preflight for that path (should be covered by global options, but explicit is fine)
  app.options("/admin-api/products/upload", cors({ origin: FRONTEND_ORIGIN, credentials: true }));

  // -------------------------
  // Mount routes
  // -------------------------
  if (otpRoutes) {
    app.use("/api/otp", otpRoutes);
    console.log("✅ Mounted /api/otp routes");
  } else {
    console.warn("⚠️ /api/otp not mounted (route file missing)");
  }

  if (orderRoutes) {
    app.use("/api/orders", orderRoutes);
    console.log("✅ Mounted /api/orders routes");
  }

  if (authRoutes) {
    app.use("/api/auth", authRoutes);
    console.log("✅ Mounted /api/auth routes");
  }

  if (protectedRoutes) {
    app.use("/api/protected", protectedRoutes);
    console.log("✅ Mounted /api/protected routes");
  }

  if (productRoutes) {
    app.use("/api", productRoutes);
    console.log("✅ Mounted /api (product) routes");
  } else {
    console.warn("⚠️ Product routes not mounted");
  }

  if (adminProductRoutes) {
    app.use("/admin-api", adminProductRoutes);
    console.log("✅ Mounted /admin-api (admin product) routes");
  } else {
    console.warn("⚠️ Admin product routes not mounted");
  }

  // Health check
  app.get("/_health", (req, res) => res.json({ ok: true, uptime: process.uptime() }));

  // --- List registered routes for debugging ---
  function listRoutes(appToList) {
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
  }

  listRoutes(app);

  // Start server
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

main().catch((e) => {
  console.error("Fatal startup error:", e);
  process.exit(1);
});
