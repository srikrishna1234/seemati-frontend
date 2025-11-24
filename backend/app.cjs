"use strict";

const path = require("path");
const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const compression = require("compression");
const cors = require("cors");

const app = express();

app.use(helmet());
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// === Robust CORS configuration ===
// Allowed explicit origins (add any other exact origins you want)
const explicitAllowed = new Set([
  "https://seemati.in",
  "https://www.seemati.in",
  "https://api.seemati.in",
  // add exact preview urls you trust here, e.g. 'https://your-preview-url.vercel.app'
]);

// Helper to check if origin is allowed
function isAllowedOrigin(origin) {
  if (!origin) return true; // allow non-browser requests (curl, server-to-server)
  // Exact match allowed
  if (explicitAllowed.has(origin)) return true;
  try {
    const u = new URL(origin);
    const host = u.hostname.toLowerCase();

    // allow any subdomain of seemati.in (e.g., admin.seemati.in)
    if (host === "seemati.in" || host.endsWith(".seemati.in")) return true;

    // allow Vercel preview domains and similar preview hosts
    // tweak this rule if you want to restrict previews more
    if (host.endsWith(".vercel.app") || host.endsWith(".netlify.app")) return true;

    // allow localhost for development (adjust port as needed)
    if (host === "localhost") return true;
  } catch (e) {
    // If URL parsing fails, reject by default
    return false;
  }
  return false;
}

// Use dynamic origin function so Access-Control-Allow-Origin is NOT '*'
// when credentials are sent (withCredentials=true)
app.use((req, res, next) => {
  if (process.env.DEBUG_CORS) {
    console.log("[CORS DEBUG] incoming origin:", req.get("origin"));
  }
  next();
});

app.use(cors({
  origin: (origin, callback) => {
    // allow requests without origin (server-to-server or curl)
    if (!origin) return callback(null, true);

    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    // Log the blocked origin for debugging and return a helpful error
    console.warn("[CORS] blocked origin:", origin);
    return callback(new Error("CORS policy: origin not allowed"), false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
}));

// --- Mount routers here ---
try {
  const otpRouter = require("./src/routes/otpRoutes.cjs");
  app.use("/api/otp", otpRouter);
  console.log("Mounted router: /api/otp -> ./src/routes/otpRoutes.cjs");
} catch (err) {
  console.error("Failed to mount OTP router:", err && err.stack ? err.stack : err);
}

try {
  const productRoutes = require("./src/routes/productRoutes.cjs");
  app.use("/api/products", productRoutes);
  console.log("Mounted router: /api/products -> ./src/routes/productRoutes.cjs");
} catch (err) {
  // ignore if not present
}

// static folders
app.use("/public", express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// health
app.get("/health", (req, res) => res.json({ ok: true, uptime: process.uptime() }));

// explicit API 404 JSON
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }
  res.status(404).send("Not Found");
});

// error handler
app.use((err, req, res, next) => {
  console.error(err && err.stack ? err.stack : err);
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  if (req.path.startsWith("/api")) {
    return res.status(status).json({ error: message });
  }
  res.status(status).send(message);
});

const PORT = process.env.PORT || 4000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend listening on port ${PORT} (NODE_ENV=${process.env.NODE_ENV || "dev"})`);
  });
}

module.exports = app;
