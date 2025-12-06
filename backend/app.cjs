// backend/app.cjs
"use strict";

/**
 * Robust Express app entry (CommonJS).
 * - Reads ALLOWED_ORIGINS or CORS_ORIGINS env var (comma-separated).
 * - Allows *.vercel.app previews automatically.
 * - Sets credentials: true for cookie auth (seemati_auth).
 *
 * Drop this file into backend/app.cjs (it is required by your bootstrap loader).
 */

const fs = require("fs");
const path = require("path");
const http = require("http");
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

// load .env if present (optional)
try {
  // eslint-disable-next-line global-require
  require("dotenv").config();
} catch (e) {
  // dotenv may not be installed — ignore
}

const app = express();

// --- Helper: read allowed origins from env (either ALLOWED_ORIGINS or CORS_ORIGINS) ---
const rawOrigins =
  process.env.ALLOWED_ORIGINS?.trim() || process.env.CORS_ORIGINS?.trim() || "";
// split on commas and trim
let allowedOrigins = rawOrigins
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Normalize entries: if user added trailing slashes or spaces, trim
allowedOrigins = allowedOrigins.map((o) => o.replace(/\/$/, ""));

// Always allow localhost for local dev (if not already present)
if (!allowedOrigins.includes("http://localhost:3000")) {
  allowedOrigins.push("http://localhost:3000");
}

// Convert entries that look like /regex/ into RegExp objects
const allowedMatchers = allowedOrigins.map((entry) => {
  // simple heuristic: an entry starting and ending with '/' is a regex
  if (entry.length > 2 && entry.startsWith("/") && entry.endsWith("/")) {
    try {
      return new RegExp(entry.slice(1, -1));
    } catch (e) {
      // ignore invalid regex, fall back to string
      return entry;
    }
  }
  return entry;
});

// Always allow vercel preview apps (e.g. something.vercel.app)
const allowVercelPreview = (origin) => /\.vercel\.app$/.test(origin);

// --- CORS middleware ---
app.use(
  cors({
    origin: function (origin, callback) {
      // allow non-browser requests (Postman, server-to-server) with no origin
      if (!origin) return callback(null, true);

      // If origin exactly matches one of the allowed strings
      for (const m of allowedMatchers) {
        if (typeof m === "string") {
          if (m === origin) return callback(null, true);
        } else if (m instanceof RegExp) {
          if (m.test(origin)) return callback(null, true);
        }
      }

      // allow Vercel preview domains automatically
      if (allowVercelPreview(origin)) return callback(null, true);

      // not allowed
      console.warn(`[CORS] Blocked origin: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true, // important: allow cookies such as seemati_auth
    exposedHeaders: ["set-cookie"],
    optionsSuccessStatus: 204,
  })
);

// Standard middleware
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Example: enrich response header with the allowed origin when request passes CORS check.
// Note: the cors middleware already sets Access-Control-Allow-Origin to the request origin value
// when the origin is allowed. This additional middleware is only for explicit logging.
app.use((req, res, next) => {
  // log the origin for debugging (comment out in production if noisy)
  // console.debug(`[CORS] incoming origin: ${req.headers.origin || "(none)"} path: ${req.path}`);
  next();
});

// --- Try to mount your existing routes if present ---
// The code will attempt to mount common route entry points if they exist so you can drop this file in safely.
const tryMount = (relativePath, mountPath = "/") => {
  const target = path.join(__dirname, relativePath);
  if (fs.existsSync(target) || fs.existsSync(`${target}.js`) || fs.existsSync(`${target}.cjs`)) {
    try {
      const router = require(target);
      // If the module exports an express app, mount it; if it exports a router, use it.
      if (typeof router === "function") {
        // If it's an express app instance with app.listen, we mount router as middleware if it exports .router
        app.use(mountPath, router);
        console.log(`[BOOT] Mounted ${relativePath} at ${mountPath}`);
        return true;
      }
    } catch (err) {
      console.warn(`[BOOT] Failed to mount ${relativePath}:`, err && err.message);
      return false;
    }
  }
  return false;
};

// Try a few common locations where routes might live in your project
const tried = [
  tryMount("routes"), // backend/routes/index.js
  tryMount("routes/index.js"),
  tryMount("src/routes"),
  tryMount("src/routes/index.js"),
  tryMount("api"), // legacy
  tryMount("server"), // server.js
  tryMount("app"), // app.js (if your app exports a router)
].some(Boolean);

// If no existing routes were mounted, create a minimal health + placeholder routes
if (!tried) {
  console.log("[BOOT] No existing routes found (routes/, src/routes/, server, etc.). Creating placeholder routes.");

  app.get("/api/health", (req, res) => {
    res.json({ ok: true, env: process.env.NODE_ENV || "development" });
  });

  // minimal products route for testing (optional). Remove if your real routes exist.
  app.get("/api/products", (req, res) => {
    // Send empty array or a simple sample. If your real backend provides this route,
    // the tryMount above should have mounted it and this will be unused.
    res.json({
      success: true,
      products: [
        // sample product for quick verification; remove in production
        // { _id: "test-1", title: "SAMPLE", sku: "SAMPLE-001", price: 10 }
      ],
    });
  });
}

// --- Error handler for CORS blocking (useful in logs) ---
app.use((err, req, res, next) => {
  if (err && err.message && /CORS|Not allowed/.test(err.message)) {
    console.warn(`[ERROR] CORS error for origin ${req.headers.origin}:`, err.message);
    res.status(403).json({ success: false, error: "CORS blocked: origin not allowed" });
    return;
  }
  // fallback to next error handler
  next(err);
});

// --- Start server ---
const port = process.env.PORT || 4000;
const server = http.createServer(app);

server.listen(port, () => {
  console.log(`[BOOT] Express server listening on port ${port} (PID: ${process.pid})`);
  console.log(`[BOOT] Allowed origins: ${JSON.stringify(allowedOrigins)}`);
});

// Export app/server for tests or other tooling if needed
module.exports = { app, server };
