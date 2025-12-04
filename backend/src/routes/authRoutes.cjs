// backend/src/routes/auth.cjs
// CommonJS full replacement for auth routes with safe OTP-bypass toggle

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
let verifyOtpReal = null;
let sendOtpReal = null;
try {
  const mod = require('../utils/otpVerifier');
  // support both direct function export or object with verifyOtp/sendOtp
  if (typeof mod === 'function') verifyOtpReal = mod;
  else if (mod && typeof mod.verifyOtp === 'function') verifyOtpReal = mod.verifyOtp;
  if (mod && typeof mod.sendOtp === 'function') sendOtpReal = mod.sendOtp;
} catch (e) {
  // not present — we'll rely on OTP_BYPASS flag below
  console.warn('[AuthRoutes] OTP verifier module not found; OTP_BYPASS available for testing.');
}

// Configure test bypass (OFF by default)
const OTP_BYPASS = String(process.env.OTP_BYPASS || 'false').toLowerCase() === 'true';
const OTP_TEST_CODE = process.env.OTP_TEST_CODE || '1234';

// Helper: verifies OTP using real verifier if available, otherwise checks bypass config
async function verifyOtp(phone, otp) {
  if (verifyOtpReal) {
    try {
      return await verifyOtpReal(phone, otp);
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
async function sendOtp(phone) {
  if (sendOtpReal) {
    try {
      return await sendOtpReal(phone); // should return truthy on success
    } catch (e) {
      console.error('[AuthRoutes] sendOtpReal error:', e && e.message ? e.message : e);
      return false;
    }
  }

  // No real sender: allow bypass only when enabled
  if (OTP_BYPASS) {
    // do not actually send SMS — just inform caller that bypass is active
    return { bypass: true, message: `OTP bypass enabled. Use code ${OTP_TEST_CODE}` };
  }

  return false;
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
 *
 * Returns:
 * - { ok:true, message } when sent or bypass note when OTP_BYPASS is on
 * - 400 when phone missing
 * - 500 when sending not configured
 */
router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body || {};
    if (!phone) return res.status(400).json({ ok: false, message: 'Phone number required' });

    const sent = await sendOtp(phone);
    if (!sent) {
      // Not configured and bypass not available
      return res.status(501).json({ ok: false, message: 'OTP send not configured on server' });
    }

    // If sendOtp returned an object (bypass info), include that in response
    if (typeof sent === 'object') {
      return res.json({ ok: true, message: sent.message || 'OTP bypass active', bypass: !!sent.bypass });
    }

    // success
    return res.json({ ok: true, message: 'OTP sent' });
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

    const ok = await verifyOtp(phone, otp);
    if (!ok) {
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

    const ok = await verifyOtp(phone, otp);
    if (!ok) {
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
