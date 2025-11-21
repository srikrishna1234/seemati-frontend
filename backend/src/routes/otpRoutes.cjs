// backend/src/routes/otpRoutes.cjs
//console.log("[OTP ROUTES] otpRoutes.cjs module loading");

const express = require("express");
const crypto = require("crypto");
const axios = require("axios");
const jwt = require("jsonwebtoken"); // optional, only used if JWT_SECRET set
const Otp = require("../../models/Otp.cjs"); // adjust path if your model name differs
const router = express.Router();

// --- Environment Config ---
const MSG91_API_KEY = process.env.MSG91_API_KEY;
const MSG91_SENDER_ID = process.env.MSG91_SENDER_ID || "SEEMTI";
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID;
const MSG91_ROUTE = process.env.MSG91_ROUTE || 4;
const MSG91_COUNTRY = process.env.MSG91_COUNTRY || 91;

// OTP Config
const OTP_TTL = parseInt(process.env.OTP_TTL || "300", 10); // seconds (default 5 min)
const OTP_LENGTH = parseInt(process.env.OTP_LENGTH || "6", 10);
const OTP_VERIFY_ATTEMPT_LIMIT = parseInt(process.env.OTP_VERIFY_ATTEMPT_LIMIT || "5", 10);

// JWT (optional)
const JWT_SECRET = process.env.JWT_SECRET || null;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "2h"; // token expiry

// --- Helper Functions ---
function generateOtp(length = 6) {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function hashOtp(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

// normalize mobile: accept either "9190..." or "9042..." and output e.g. "919042163246"
function normalizeMobile(input) {
  if (!input) return "";
  const digits = String(input).replace(/\D/g, "");
  const countryStr = String(MSG91_COUNTRY);
  // if already starts with country code
  if (digits.startsWith(countryStr)) return digits;
  return countryStr + digits;
}

// --- Route: Send OTP ---
router.post("/send", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: "Phone number required" });

    const normalized = normalizeMobile(phone);

    // Generate new OTP
    const otpCode = generateOtp(OTP_LENGTH);
    const codeHash = hashOtp(otpCode);
    const expiresAt = new Date(Date.now() + OTP_TTL * 1000);

    // Remove any previous OTP records for this normalized phone
    await Otp.deleteMany({ phone: normalized }).catch(() => {});

    // Create record in DB and include normalized phone
    const created = await Otp.create({
      phone: normalized,
      codeHash,
      expiresAt,
      attempts: 0,
      meta: { createdAt: new Date() },
    });

    if (process.env.NODE_ENV !== "production") {
  console.log(`[OTP][dev] Saved OTP for ${normalized} (input: ${phone}). OTP: ${otpCode}`);
}

    // --- Send via MSG91 OTP API (v5) ---
    if (!MSG91_API_KEY || !MSG91_TEMPLATE_ID) {
      console.warn("MSG91 config missing; OTP saved but not sent.");
      return res.json({ success: true, message: "OTP saved (MSG91 not configured)" });
    }

    const MSG91_URL = "https://api.msg91.com/api/v5/otp";

    // payload for OTP API
    const payload = {
      mobile: normalized,
      template_id: MSG91_TEMPLATE_ID,
      otp: String(otpCode),
    };

    const headers = {
      authkey: MSG91_API_KEY,
      "Content-Type": "application/json",
    };

    // send request to MSG91
    let response;
    try {
      response = await axios.post(MSG91_URL, payload, {
        headers,
        timeout: 10000,
      });
    } catch (sendErr) {
      // keep DB record but log the error and inform client
      console.error("[MSG91] send error:", sendErr && sendErr.message ? sendErr.message : sendErr);
      return res.status(500).json({ success: false, message: "Failed to send OTP via MSG91" });
    }

    // log response (show request_id if present)
    let requestId = null;
    if (response && response.data) {
      console.log("[MSG91 Response]", response.data);
      requestId = response.data.request_id || response.data.message || null;

      // Save request_id to the OTP record if present
      if (requestId) {
        try {
          await Otp.updateOne({ _id: created._id }, { $set: { requestId } }).catch(() => {});
        } catch (e) {
          // non-fatal
        }
      }
    }

    // respond to client with request_id so frontend can track
    return res.json({
      success: true,
      message: "OTP sent successfully",
      request_id: requestId,
    });
  } catch (err) {
    console.error("Error in /send:", err && err.message ? err.message : err);
    return res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
});

// --- Route: Verify OTP ---
router.post("/verify", async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ success: false, message: "Phone and OTP required" });

    const normalized = normalizeMobile(phone);

    const record = await Otp.findOne({ phone: normalized });
    if (!record) return res.status(400).json({ success: false, message: "No OTP found or expired" });

    const now = Date.now();
    const expiresAt = record.expiresAt ? new Date(record.expiresAt).getTime() : 0;
    if (expiresAt < now) {
      // expired - cleanup
      await Otp.deleteOne({ _id: record._id }).catch(() => {});
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    const hashedInput = hashOtp(otp);
    if (hashedInput !== record.codeHash) {
      // increment attempts
      record.attempts = (record.attempts || 0) + 1;
      await record.save().catch(() => {});
      // if attempts exceeded, remove record
      if (record.attempts >= OTP_VERIFY_ATTEMPT_LIMIT) {
        await Otp.deleteOne({ _id: record._id }).catch(() => {});
        return res.status(429).json({ success: false, message: "Too many invalid attempts. OTP removed." });
      }
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    // OTP verified â†’ remove entry
    await Otp.deleteOne({ _id: record._id }).catch(() => {});

    console.log(`[OTP Verified] ${normalized} verified successfully`);

    // Optionally issue JWT token if configured
    let token = null;
    if (JWT_SECRET) {
      try {
        // Keep payload minimal
        const payload = { sub: normalized };
        token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
      } catch (e) {
        console.warn("JWT sign failed:", e && e.message ? e.message : e);
        token = null;
      }
    }

    return res.json({
      success: true,
      message: "OTP verified successfully",
      token, // may be null if JWT_SECRET not set
    });
  } catch (err) {
    console.error("Error in /verify:", err && err.message ? err.message : err);
    return res.status(500).json({ success: false, message: "Verification failed" });
  }
});

module.exports = router;
