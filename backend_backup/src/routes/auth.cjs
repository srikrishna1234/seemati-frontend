// backend/src/routes/auth.cjs
require("dotenv").config();
const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { RateLimiterRedis, RateLimiterMemory } = require("rate-limiter-flexible");
const Redis = require("ioredis");
const axios = require("axios");

const User = require("../../models/User.cjs");
const Otp = require("../../models/Otp.cjs");
const { signUserToken } = require("../lib/auth.cjs");

// Config from .env
const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const OTP_MAX = parseInt(process.env.OTP_MAX || "3", 10);
const OTP_WINDOW_MINUTES = parseInt(process.env.OTP_WINDOW_MINUTES || "15", 10);
const OTP_WINDOW_SECONDS = OTP_WINDOW_MINUTES * 60;
const OTP_BLOCK_TIME = parseInt(process.env.OTP_BLOCK_TIME || String(OTP_WINDOW_SECONDS), 10);
const OTP_LENGTH = parseInt(process.env.OTP_LENGTH || "6", 10);
const OTP_TTL = parseInt(process.env.OTP_TTL || "300", 10);
const OTP_ATTEMPT_LIMIT = parseInt(process.env.OTP_VERIFY_ATTEMPT_LIMIT || "5", 10);

// Redis client
let redisClient = null;
try {
  const redisOptions = { maxRetriesPerRequest: 3 };
  if (REDIS_URL.startsWith("rediss://") || REDIS_URL.startsWith("rediss:")) {
    redisOptions.tls = { rejectUnauthorized: false };
  }
  redisClient = new Redis(REDIS_URL, redisOptions);
  redisClient.on("error", (err) => console.error("[Redis] error:", err?.message || err));
  redisClient.on("connect", () => console.log("[Redis] connect"));
  redisClient.on("ready", () => console.log("[Redis] ready"));
} catch (e) {
  console.error("[Redis] client creation failed:", e);
  redisClient = null;
}

// Rate limiter
let otpRateLimiter;
if (redisClient) {
  otpRateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: "rl_otp",
    points: OTP_MAX,
    duration: OTP_WINDOW_SECONDS,
    blockDuration: OTP_BLOCK_TIME,
  });
  console.log("[RateLimiter] Using Redis-backed limiter");
} else {
  otpRateLimiter = new RateLimiterMemory({
    points: OTP_MAX,
    duration: OTP_WINDOW_SECONDS,
    blockDuration: OTP_BLOCK_TIME,
  });
  console.warn("[RateLimiter] Redis not available - using in-memory limiter (single-instance only)");
}

// Helpers
function generateNumericOtp(length = OTP_LENGTH) {
  const max = 10 ** length;
  const n = crypto.randomInt(0, max);
  return String(n).padStart(length, "0");
}

function hashCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

function normalizePhone(phone) {
  return String(phone || "").replace(/[^\d+]/g, "");
}

async function consumeOtpQuota(identifierKey) {
  try {
    await otpRateLimiter.consume(identifierKey, 1);
    return { success: true };
  } catch (rlRejected) {
    if (rlRejected instanceof Error) {
      console.error("[RateLimiter] unexpected error", rlRejected);
      return { success: false, error: "rate_limiter_error" };
    }
    const retryAfterSec = Math.ceil((rlRejected.msBeforeNext || OTP_BLOCK_TIME * 1000) / 1000) || 1;
    return { success: false, retryAfterSec };
  }
}

/**
 * MSG91 send helper (tries common payload shapes and caches provider response in Redis)
 */
async function sendSms(phone, otp) {
  const url = "https://control.msg91.com/api/v5/flow";
  const headers = {
    authkey: process.env.MSG91_API_KEY,
    "Content-Type": "application/json",
  };

  if (!process.env.MSG91_TEMPLATE_ID || !process.env.MSG91_SENDER_ID || !process.env.MSG91_API_KEY) {
    console.error("[MSG91] missing MSG91_TEMPLATE_ID or MSG91_SENDER_ID or MSG91_API_KEY in env");
    return { ok: false, reason: "missing_env" };
  }

  // Try a few payload shapes used by Flow API and dashboard examples
  const payloads = [
    // shape A: recipients array with "mobile" and "variables"
    {
      template_id: process.env.MSG91_TEMPLATE_ID,
      sender: process.env.MSG91_SENDER_ID,
      recipients: [
        {
          mobile: phone,
          variables: { OTP: otp }
        }
      ]
    },
    // shape B: recipients array with "mobiles" (alternate)
    {
      template_id: process.env.MSG91_TEMPLATE_ID,
      sender: process.env.MSG91_SENDER_ID,
      recipients: [
        {
          mobiles: phone,
          variables: { OTP: otp }
        }
      ]
    },
    // shape C: top-level mobiles + variables
    {
      template_id: process.env.MSG91_TEMPLATE_ID,
      sender: process.env.MSG91_SENDER_ID,
      mobiles: phone,
      variables: { OTP: otp }
    }
  ];

  for (let i = 0; i < payloads.length; i++) {
    const payload = payloads[i];
    try {
      const resp = await axios.post(url, payload, { headers, timeout: 15000 });
      console.log(`[MSG91] try#${i + 1} status=${resp.status} body=`, JSON.stringify(resp.data));
      const body = resp.data || {};
      const isSuccess = resp.status === 200 && (body.type === "success" || typeof body.message === "string" || typeof body.request_id === "string" || body.data);
      if (isSuccess) {
        // Cache provider response under key msg91:msgid:<id> if present
        const maybeId = body.message || body.request_id || (body.data && (body.data.request_id || body.data.message_id)) || null;
        if (redisClient && maybeId) {
          try {
            const key = `msg91:msgid:${maybeId}`;
            await redisClient.set(key, JSON.stringify({ mobile: phone, payloadUsed: i + 1, resp: body, createdAt: new Date().toISOString() }), "EX", 60 * 60 * 24);
          } catch (e) {
            console.warn("[MSG91] redis store failed:", e);
          }
        }
        return { ok: true, provider: body, payloadIndex: i + 1, messageId: maybeId };
      }
      // not treated as success by provider -> try next shape
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;
      console.error(`[MSG91] try#${i + 1} error status=${status} body=`, JSON.stringify(data) || err.message || err);
      // continue to next shape
    }
  }

  console.error("[MSG91] all payload attempts failed for mobile:", phone);
  return { ok: false, reason: "all_attempts_failed" };
}

// POST /api/auth/send-otp
router.post("/send-otp", async (req, res) => {
  try {
    const rawPhone = req.body.phone || req.body.identifier || "";
    const phone = normalizePhone(rawPhone);
    if (!phone) return res.status(400).json({ ok: false, message: "phone required" });

    const identifierKey = `phone:${phone}`;
    const quota = await consumeOtpQuota(identifierKey);
    if (!quota.success) {
      res.set("Retry-After", String(quota.retryAfterSec));
      return res.status(429).json({
        ok: false,
        message: `Too many OTP requests. Try again in ${quota.retryAfterSec} seconds.`,
        retryAfterSeconds: quota.retryAfterSec,
      });
    }

    const code = generateNumericOtp(OTP_LENGTH);
    const codeHash = hashCode(code);
    const expiresAt = new Date(Date.now() + OTP_TTL * 1000);

    await Otp.findOneAndUpdate(
      { phone },
      { phone, codeHash, expiresAt, attempts: 0, createdAt: new Date() },
      { upsert: true, new: true }
    );

    // DEV: optionally print OTP to server logs for debugging
    // Will print if NODE_ENV !== "production" OR SHOW_OTP=true in .env
    const showOtp = process.env.SHOW_OTP === "true" || process.env.NODE_ENV !== "production";
    if (showOtp) {
      console.log(`[DEBUG-OTP] phone=${phone} otp=${code} (dev-only log)`);
    }

    const smsResult = await sendSms(phone, code);

    if (!smsResult.ok) {
      // cleanup OTP if SMS failed
      try { await Otp.deleteOne({ phone }); } catch (e) { console.error("[auth.send-otp] cleanup failed:", e); }
      console.error("[auth.send-otp] smsResult:", smsResult);
      return res.status(502).json({ ok: false, message: "Failed to send SMS OTP", detail: smsResult });
    }

    // return provider info (no OTP)
    return res.json({ ok: true, message: "OTP sent", provider: smsResult.provider || null, messageId: smsResult.messageId || null });
  } catch (err) {
    console.error("[auth.send-otp] error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

// POST /api/auth/verify-otp
router.post("/verify-otp", async (req, res) => {
  try {
    const rawPhone = req.body.phone || req.body.identifier || "";
    const phone = normalizePhone(rawPhone);
    const code = String(req.body.code || "").trim();
    if (!phone || !code) return res.status(400).json({ ok: false, message: "phone & code required" });

    const otpDoc = await Otp.findOne({ phone });
    if (!otpDoc) return res.status(400).json({ ok: false, message: "No OTP request found" });

    if (otpDoc.expiresAt && otpDoc.expiresAt < new Date()) {
      await Otp.deleteOne({ phone });
      return res.status(400).json({ ok: false, message: "OTP expired" });
    }

    otpDoc.attempts = otpDoc.attempts || 0;
    if (otpDoc.attempts >= OTP_ATTEMPT_LIMIT) {
      await Otp.deleteOne({ phone });
      return res.status(429).json({ ok: false, message: "Too many incorrect attempts" });
    }

    const codeHash = hashCode(code);
    if (codeHash !== otpDoc.codeHash) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      return res.status(400).json({ ok: false, message: "Invalid OTP" });
    }

    let user = await User.findOne({ phone });
    if (!user) {
      user = await User.create({ phone, name: req.body.name || "" });
    }

    await Otp.deleteOne({ phone });

    const token = signUserToken(user);
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 3600 * 1000,
    });

    return res.json({ ok: true, user: { id: user._id, phone: user.phone, name: user.name } });
  } catch (err) {
    console.error("[auth.verify-otp] error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

// GET /api/auth/me
router.get("/me", async (req, res) => {
  try {
    const token =
      (req.cookies && req.cookies.token) ||
      (req.headers.authorization && req.headers.authorization.split(" ")[1]);
    if (!token) return res.status(401).json({ ok: false, message: "Unauthorized" });

    const jwt = require("jsonwebtoken");
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev_jwt_secret_change_me");
    return res.json({ ok: true, user: payload });
  } catch (err) {
    return res.status(401).json({ ok: false, message: "Invalid or expired token" });
  }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    return res.json({ ok: true, message: "Logged out" });
  } catch (err) {
    console.error("[auth.logout] error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

// GET /api/auth/logout (convenience)
router.get("/logout", (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    return res.json({ ok: true, message: "Logged out" });
  } catch (err) {
    console.error("[auth.logout] error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

/**
 * Lookup cached provider response by message id
 * GET /api/auth/msg/:id
 */
router.get("/msg/:id", async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ ok: false, message: "id required" });
    if (!redisClient) return res.status(503).json({ ok: false, message: "redis not configured" });

    const key = `msg91:msgid:${id}`;
    const raw = await redisClient.get(key);
    if (!raw) return res.status(404).json({ ok: false, message: "not found in redis" });

    return res.json({ ok: true, id, data: JSON.parse(raw) });
  } catch (err) {
    console.error("[auth.msg.lookup] error:", err);
    return res.status(500).json({ ok: false, message: "server error" });
  }
});

/**
 * MSG91 webhook receiver for delivery & status updates
 * -> Configure this URL in MSG91 webhook settings if you want delivery callbacks.
 * Optional: set MSG91_WEBHOOK_SECRET in .env and add header check.
 */
router.post("/sms-webhook", async (req, res) => {
  try {
    const secret = process.env.MSG91_WEBHOOK_SECRET;
    if (secret) {
      const header = req.headers["x-msg91-webhook-secret"] || req.headers["x-msg91-secret"];
      if (!header || header !== secret) {
        console.warn("[MSG91][webhook] invalid secret header");
        return res.status(401).json({ ok: false, message: "invalid webhook secret" });
      }
    }

    const payload = req.body || {};
    console.log("[MSG91][webhook] incoming:", JSON.stringify(payload));

    // store small copy in redis for lookup (optional)
    const webhookId = payload?.message_id || payload?.messageId || payload?.request_id || payload?.message;
    if (redisClient && webhookId) {
      try {
        const key = `msg91:webhook:${webhookId}`;
        await redisClient.set(key, JSON.stringify({ payload, receivedAt: new Date().toISOString() }), "EX", 60 * 60 * 24 * 7);
      } catch (e) {
        console.error("[MSG91][webhook] redis store failed:", e);
      }
    }

    // TODO: optionally update DB / analytics about delivery
    return res.json({ ok: true });
  } catch (err) {
    console.error("[MSG91][webhook] error:", err);
    return res.status(500).json({ ok: false, message: "webhook error" });
  }
});

module.exports = router;
