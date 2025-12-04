// backend/src/routes/authRoutes.cjs
// Auth routes — robust handling for MSG91-based OTP send + verify
'use strict';

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const COOKIE_NAME = process.env.COOKIE_NAME || 'seemati_auth';
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined; // e.g. ".seemati.in"
const NODE_ENV = process.env.NODE_ENV || 'development';

// Load adminAuth middleware if present
let adminAuth;
try {
  adminAuth = require('../middleware/adminAuth.cjs');
} catch (e) {
  console.error('[AuthRoutes] could not load adminAuth middleware:', e && e.message ? e.message : e);
  adminAuth = (req, res, next) => {
    return res.status(500).json({ ok: false, message: 'Auth middleware missing' });
  };
}

// Try to load a real OTP verifier if present
// Expect exports: sendOtp(phone) -> {success:boolean,...}, verifyOtp(phone,otp) -> {success:boolean,...}
let otpModule = null;
let sendOtpReal = null;
let verifyOtpReal = null;

try {
  otpModule = require('../utils/otpVerifier');
  if (otpModule) {
    if (typeof otpModule === 'function') {
      // legacy: module exported a single verify function (unlikely in our setup)
      verifyOtpReal = otpModule;
    } else {
      if (typeof otpModule.sendOtp === 'function') sendOtpReal = otpModule.sendOtp;
      if (typeof otpModule.verifyOtp === 'function') verifyOtpReal = otpModule.verifyOtp;
    }
  }
  if (sendOtpReal || verifyOtpReal) console.log('[AuthRoutes] otpVerifier loaded.');
} catch (e) {
  console.warn('[AuthRoutes] OTP verifier module not found; OTP_BYPASS available for testing.');
}

// Configure test bypass (OFF by default)
const OTP_BYPASS = String(process.env.OTP_BYPASS || 'false').toLowerCase() === 'true';
const OTP_TEST_CODE = process.env.OTP_TEST_CODE || '1234';

// Helper: verifies OTP using real verifier if available, otherwise checks bypass config
// Returns boolean
async function verifyOtp(phone, otp) {
  if (verifyOtpReal) {
    try {
      const r = await verifyOtpReal(phone, otp);
      // support both boolean returns and { success: boolean } returns
      if (typeof r === 'boolean') return r;
      if (r && typeof r === 'object') return !!r.success;
      // fallback: truthy object -> success
      return !!r;
    } catch (e) {
      console.error('[AuthRoutes] verifyOtpReal error:', e && e.message ? e.message : e);
      return false;
    }
  }

  // No real verifier; allow bypass only when explicitly enabled
  if (OTP_BYPASS) {
    return String(otp) === String(OTP_TEST_CODE);
  }

  // Otherwise, deny
  return false;
}

// Helper: send OTP using real provider if available, otherwise return bypass message/status
// Returns normalized object: { success: boolean, message?, bypass?, raw?, txnId? }
async function sendOtp(phone) {
  if (sendOtpReal) {
    try {
      const r = await sendOtpReal(phone);
      // normalize return
      if (typeof r === 'boolean') {
        return r ? { success: true } : { success: false };
      }
      if (r && typeof r === 'object') {
        // ensure boolean success field exists
        if (typeof r.success === 'boolean') return r;
        // older implementations may return raw provider data -> treat truthy as success
        return { success: true, raw: r };
      }
      return { success: Boolean(r) };
    } catch (e) {
      console.error('[AuthRoutes] sendOtpReal error:', e && e.message ? e.message : e);
      return { success: false, message: 'Provider error', raw: e && (e.response ? e.response.data : e.message) };
    }
  }

  // No real sender: allow bypass only when enabled
  if (OTP_BYPASS) {
    return { success: true, bypass: true, message: `OTP bypass enabled. Use code ${OTP_TEST_CODE}` };
  }

  return { success: false, message: 'OTP provider not configured on server' };
}

// Helper: create JWT
function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Helper: cookie options
function makeCookieOptions() {
  const secure = NODE_ENV === 'production';
  const opts = {
    httpOnly: true,
    secure: secure,
    sameSite: 'None',
    maxAge: parseInt(process.env.COOKIE_MAX_AGE, 10) || 1000 * 60 * 60 * 24 * 7,
    path: '/',
  };
  if (COOKIE_DOMAIN) opts.domain = COOKIE_DOMAIN;
  return opts;
}

/**
 * POST /api/auth/send-otp
 * Body: { phone }
 */
router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body || {};
    if (!phone) return res.status(400).json({ ok: false, message: 'Phone number required' });

    const result = await sendOtp(phone);

    // If provider indicates success
    if (result && result.success) {
      const payload = { ok: true, message: result.message || 'OTP sent' };
      if (result.bypass) payload.bypass = true;
      if (result.txnId) payload.txnId = result.txnId;
      return res.json(payload);
    }

    // Not configured or failed
    const msg = result && result.message ? result.message : 'Failed to send OTP';
    const status = msg.toLowerCase().includes('configured') ? 501 : 500;
    return res.status(status).json({ ok: false, message: msg, details: result && result.raw ? result.raw : undefined });
  } catch (err) {
    console.error('[AuthRoutes] /send-otp error:', err && err.message ? err.message : err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

/**
 * POST /api/auth/verify-otp
 * Body: { phone, otp }
 *
 * On success, sets auth cookie (same as /login) and returns user.
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body || {};
    if (!phone || !otp) {
      return res.status(400).json({ ok: false, message: 'Phone and OTP are required' });
    }

    // If verifyOtpReal exists and returns a structured object, interpret it
    if (verifyOtpReal) {
      try {
        const r = await verifyOtpReal(phone, otp);
        // r may be boolean or { success:true }
        const ok = (typeof r === 'boolean') ? r : (r && typeof r === 'object' ? !!r.success : !!r);
        if (!ok) {
          const msg = r && r.message ? r.message : 'Invalid OTP';
          return res.status(401).json({ ok: false, message: msg, details: r && r.raw ? r.raw : undefined });
        }
      } catch (e) {
        console.error('[AuthRoutes] verifyOtpReal error:', e && e.message ? e.message : e);
        return res.status(500).json({ ok: false, message: 'OTP verification failed' });
      }
    } else {
      // fallback to OTP_BYPASS behavior
      const ok = OTP_BYPASS ? String(otp) === String(OTP_TEST_CODE) : false;
      if (!ok) return res.status(401).json({ ok: false, message: 'Invalid OTP' });
    }

    const userPayload = {
      id: phone,
      phone,
      role: 'admin',
    };

    const token = createToken(userPayload);
    const cookieOptions = makeCookieOptions();

    res.cookie(COOKIE_NAME, token, cookieOptions);

    return res.json({
      ok: true,
      message: 'Verified and logged in',
      user: { id: userPayload.id, phone: userPayload.phone, role: userPayload.role },
      otpBypass: OTP_BYPASS ? true : undefined,
    });
  } catch (err) {
    console.error('[AuthRoutes] /verify-otp error:', err && err.message ? err.message : err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

/**
 * POST /api/auth/login
 * Body: { phone, otp }
 *
 * Kept for backward compatibility (single-step)
 */
router.post('/login', async (req, res) => {
  try {
    const { phone, otp } = req.body || {};
    if (!phone || !otp) {
      return res.status(400).json({ ok: false, message: 'Phone and OTP are required' });
    }

    // reuse verify logic
    const verified = await verifyOtp(phone, otp);
    if (!verified) {
      return res.status(401).json({ ok: false, message: 'Invalid OTP' });
    }

    const userPayload = {
      id: phone,
      phone,
      role: 'admin',
    };

    const token = createToken(userPayload);
    const cookieOptions = makeCookieOptions();

    res.cookie(COOKIE_NAME, token, cookieOptions);

    return res.json({
      ok: true,
      message: 'Logged in',
      user: { id: userPayload.id, phone: userPayload.phone, role: userPayload.role },
      otpBypass: OTP_BYPASS ? true : undefined,
    });
  } catch (err) {
    console.error('[AuthRoutes] /login error:', err && err.message ? err.message : err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', adminAuth, (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, message: 'Unauthorized' });
    return res.json({ ok: true, user: req.user });
  } catch (err) {
    console.error('[AuthRoutes] /me error:', err && err.message ? err.message : err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  try {
    const clearOpts = {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'None',
      path: '/',
    };
    if (COOKIE_DOMAIN) clearOpts.domain = COOKIE_DOMAIN;
    res.clearCookie(COOKIE_NAME, clearOpts);
  } catch (err) {
    console.error('[AuthRoutes] logout clearCookie error:', err && err.message ? err.message : err);
  }
  return res.json({ ok: true, message: 'Logged out' });
});

module.exports = router;
