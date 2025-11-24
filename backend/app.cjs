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
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// --- Mount routers here ---
try {
  const otpRouter = require("./src/routes/otpRoutes.cjs");
  app.use("/api/otp", otpRouter);
  console.log("Mounted router: /api/otp -> ./src/routes/otpRoutes.cjs");
} catch (err) {
  console.error("Failed to mount OTP router:", err && err.stack ? err.stack : err);
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
