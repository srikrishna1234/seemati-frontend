// backend/src/server.js
// Full server entry (ESM).

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// --- Import Product (ESM/CommonJS fallback) ---
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

// --- Constants ---
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

  // --- CORS ---
  app.use(
    cors({
      origin: FRONTEND_ORIGIN,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    })
  );
  app.options("*", cors({ origin: FRONTEND_ORIGIN, credentials: true }));

  // --- session ---
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

  // --- body parsers ---
  app.use(express.json({ limit: "8mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // --- cookie parser ---
  const cookieParser = require("cookie-parser");
  app.use(cookieParser());

  // --- static uploads ---
  const uploadDir = path.join(__dirname, "..", "uploads");
  if (!fs.existsSync(uploadDir)) {
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
    } catch (e) {
      console.warn("Could not create uploads dir:", e);
    }
  }
  app.use("/uploads", express.static(uploadDir));

  // --- multer setup (disk storage for admin upload) ---
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
    console.warn("⚠️ Product model not loaded. Routes may fail.");
  }

  // --- helper to dynamically import or require route modules ---
  async function loadRoute(modulePath) {
    try {
      const mod = await import(modulePath);
      return mod.default || mod;
    } catch (impErr) {
      try {
        const mod = require(modulePath);
        return mod.default || mod;
      } catch (reqErr) {
        throw impErr;
      }
    }
  }

  // --- load other routes ---
  let orderRoutes, authRoutes, otpRoutes, protectedRoutes, productRoutes, adminProductRoutes;
  try {
    orderRoutes = await loadRoute("./routes/orders.cjs");
  } catch {}

  try {
    authRoutes = await loadRoute("./routes/auth.cjs");
  } catch {}

  try {
    otpRoutes = await loadRoute("./routes/otpRoutes.cjs");
  } catch {}

  try {
    protectedRoutes = await loadRoute("./routes/protectedRoutes.cjs");
  } catch {}

  try {
    productRoutes = await loadRoute("./routes/productRoutes.cjs");
    console.log("✅ Loaded productRoutes.cjs");
  } catch {
    productRoutes = await loadRoute("./routes/productRoutes.js");
    console.log("✅ Loaded productRoutes.js (fallback)");
  }

  try {
    adminProductRoutes = await loadRoute("./routes/adminProduct.js");
  } catch {
    adminProductRoutes = await loadRoute("./routes/adminProduct.cjs");
  }

  // --- admin auth helper ---
  function checkAdminAuth(req) {
    const auth = req.headers.authorization || "";
    if (!auth) return false;
    const parts = auth.split(/\s+/);
    if (parts.length !== 2) return false;
    const [scheme, token] = parts;
    if (!/^Bearer$/i.test(scheme)) return false;
    if (ADMIN_TOKEN && token === ADMIN_TOKEN) return true;
    if (JWT_SECRET) {
      try {
        jwt.verify(token, JWT_SECRET);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  // --- admin uploads (local disk) ---
  app.post("/admin-api/products/upload", upload.any(), (req, res) => {
    try {
      if (!checkAdminAuth(req)) {
        return res.status(401).json({ ok: false, message: "Unauthorized" });
      }

      const files = req.files || [];
      if (!files.length) {
        return res.status(400).json({ ok: false, message: "No file uploaded" });
      }

      const host = process.env.SERVER_URL || `http://localhost:${PORT}`;
      const out = files.map((f) => {
        const url = `${host}/uploads/${f.filename}`;
        return { filename: f.filename, url, size: f.size };
      });

      console.log(`[admin-upload] uploaded ${out.length} file(s):`, out.map(o => o.filename).join(", "));
      return res.json(out);
    } catch (err) {
      console.error("[admin-upload] error:", err);
      return res.status(500).json({ ok: false, message: "Upload failed" });
    }
  });

  app.options("/admin-api/products/upload", cors({ origin: FRONTEND_ORIGIN, credentials: true }));

  // --- QUICK REDIRECT: handle legacy /products requests that frontend may make ---
  // This preserves the query string and forwards the request to /api/products.
  // Place this BEFORE route mounting so it takes effect for the client requests.
  app.get("/products", (req, res) => {
    try {
      const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
      // 307 keeps method semantics (GET) — explicit
      return res.redirect(307, `/api/products${qs}`);
    } catch (e) {
      console.warn("[redirect /products] error:", e);
      return res.status(500).send("Redirect failed");
    }
  });

  // --- mount all routes ---
  if (otpRoutes) app.use("/api/otp", otpRoutes);
  if (orderRoutes) app.use("/api/orders", orderRoutes);
  if (authRoutes) app.use("/api/auth", authRoutes);
  if (protectedRoutes) app.use("/api/protected", protectedRoutes);
  if (productRoutes) app.use("/api", productRoutes);
  if (adminProductRoutes) app.use("/admin-api", adminProductRoutes);

  // ✅ NEW: Mount S3 upload router
  console.log("[UploadRouter] Mounting...");
  const uploadRouter = require("./routes/upload.cjs");
  app.use("/api", uploadRouter);

  // --- test ping ---
  app.get("/api/ping", (req, res) => res.json({ ok: true, msg: "api ping" }));

  // --- health check ---
  app.get("/_health", (req, res) => res.json({ ok: true, uptime: process.uptime() }));

  // --- list routes ---
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

  // --- start server ---
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

main().catch((e) => {
  console.error("Fatal startup error:", e);
  process.exit(1);
});
