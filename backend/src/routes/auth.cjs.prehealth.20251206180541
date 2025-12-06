// backend/src/routes/auth.cjs
const express = require("express");
const router = express.Router();

// Ensure JSON parsing (in case app doesn’t apply globally)
router.use(express.json());

// Attempt multiple require paths to find otpVerifier reliably
let otpVerifier;

try {
  otpVerifier = require("../utils/otpVerifier");     // expected location
  console.log("[AuthRoutes] Loaded otpVerifier from ../utils/otpVerifier");
} catch (e1) {
  try {
    otpVerifier = require("../utils/otpverifier");   // lowercase fallback
    console.log("[AuthRoutes] Loaded otpVerifier from ../utils/otpverifier");
  } catch (e2) {
    try {
      otpVerifier = require("../../src/utils/otpVerifier"); // rare fallback
      console.log("[AuthRoutes] Loaded otpVerifier from ../../src/utils/otpVerifier");
    } catch (e3) {
      console.error("[AuthRoutes] OTP verifier module not found in all attempted paths.");
      otpVerifier = null;
    }
  }
}

// ---------------------------------------------------------------
// POST /api/auth/send-otp
// ---------------------------------------------------------------
router.post("/send-otp", async (req, res) => {
  try {
    if (!otpVerifier) {
      console.error("[AuthRoutes] OTP verifier module not found; OTP_BYPASS available for testing.");
      return res.status(501).json({
        success: false,
        message: "OTP verifier not available on server"
      });
    }

    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: "phone is required" });
    }

    console.log(`[AuthRoutes] send-otp requested for phone: ${phone}`);

    const result = await otpVerifier.sendOtp(phone);

    if (result && result.success) {
      return res.status(200).json({
        success: true,
        message: result.message || "OTP sent",
        txnId: result.txnId || null,
        raw: result.raw || null
      });
    }

    // Handle provider or configuration errors
    const msg = result?.message || "Failed to send OTP";
    const details = result?.raw || result?.error;
    const status = msg.includes("configured") ? 501 : 500;

    return res.status(status).json({
      success: false,
      message: msg,
      details
    });

  } catch (err) {
    console.error("[AuthRoutes] send-otp error:", err);
    return res.status(500).json({ success: false, message: "Server error sending OTP" });
  }
});

module.exports = router;
