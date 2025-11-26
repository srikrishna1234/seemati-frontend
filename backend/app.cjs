// app.cjs
// Full file: Express app configured for cookies + CORS + trust proxy for production deployments.

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// If your app is behind a proxy (Render, Vercel, Cloud Run), enable trust proxy
// so secure cookies and client IP detection work correctly.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1); // trust first proxy
}

// Basic security headers
app.use(helmet());

// Logging
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Body parsing + cookie parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS: allow credentials and use a whitelist from env
// Set FRONTEND_URL to the exact origin of your admin frontend (e.g. https://seemati.in or https://admin.seemati.in or the Vercel preview domain)
// You can also provide multiple origins separated by commas in FRONTEND_URLS
const rawOrigins = process.env.FRONTEND_URLS || process.env.FRONTEND_URL || "";
const allowedOrigins = rawOrigins.split(",").map(s => s.trim()).filter(Boolean);

// Fallback: if allowedOrigins is empty in dev, allow localhost
if (allowedOrigins.length === 0 && process.env.NODE_ENV !== "production") {
  allowedOrigins.push("http://localhost:3000");
}

const corsOptions = {
  origin: function (origin, callback) {
    // Allow non-browser requests (cURL, server-to-server) where origin is undefined
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      return callback(new Error("CORS: Origin not allowed"), false);
    }
  },
  credentials: true, // <--- IMPORTANT: allow cookies to be sent
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Mount your routers (adjust paths if different)
import authRouter from "./src/routes/auth.cjs";
import otpRouter from "./src/routes/otpRoutes.cjs";
import productRouter from "./src/routes/productRoutes.cjs";

app.use("/api/auth", authRouter);
app.use("/api/otp", otpRouter);
app.use("/api/products", productRouter);

// Root endpoint (health check) - return 200 so hosting platform health checks pass
app.get("/", (req, res) => {
  res.status(200).json({ ok: true, env: process.env.NODE_ENV || "development" });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ error: "Not found" });
});

// Basic error handler (improve as needed)
app.use((err, req, res, next) => {
  console.error("ERROR:", err?.message || err);
  if (err.message && err.message.includes("CORS")) {
    return res.status(403).json({ error: "CORS error: origin not allowed" });
  }
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

// Start server
const PORT = process.env.PORT || process.env.SERVER_PORT || 10000;
app.listen(PORT, () => {
  console.log(`[Mongo] Attempting connection to MongoDB...`);
  console.log(`Backend listening on port ${PORT} (NODE_ENV=${process.env.NODE_ENV})`);
});

export default app;
