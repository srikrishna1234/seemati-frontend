// backend/src/routes/authRoutes.cjs
'use strict';

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const COOKIE_NAME = process.env.COOKIE_NAME || 'seemati_auth';
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Load adminAuth middleware if present (non-fatal)
let adminAuth;
try {
  adminAuth = require('../middleware/adminAuth.cjs');
} catch (e) {
  adminAuth = (req, res, next) => {
    return res.status(500).json({ ok: false, message: 'Auth middleware missing' });
  };
}

// Load otp verifier module if present
let otpModule = null;
let sendOtpReal = null;
let verifyOtpReal = null;
try {
  otpModule = require('../utils/otpVerifier');
  if (otpModule) {
    if (typeof otpModule.sendOtp === 'function') sendOtpReal = otpModule.sendOtp;
    if (typeof otpModule.verifyOtp === 'function') verifyOtpReal = otpModule.verifyOtp;
  }
} catch (e) {
  // silent fallback to OTP_BYPASS if not present
}

// OTP bypass config for local/dev testing
const OTP_BYPASS = String(process.env.OTP_BYPASS || 'false').toLowerCase() === 'true';
const OTP_TEST_CODE = process.env.OTP_TEST_CODE || '1234';

// Create JWT token
function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Cookie options
function makeCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProd,                         // HTTPS only in prod
    sameSite: isProd ? 'None' : 'Lax',      // local dev compatible
    path: '/',
    ...(isProd ? { domain: '.seemati.in' } : {}),
    maxAge: 1000 * 60 * 60 * 24 * 7,
  };
}



// Normalize provider result to { success: boolean, ... }
async function callSendOtp(phone) {
  if (sendOtpReal) {
    try {
      const r = await sendOtpReal(phone);
      if (typeof r === 'boolean') return { success: Boolean(r) };
      if (r && typeof r === 'object') {
        if (typeof r.success === 'boolean') return r;
        return { success: true, raw: r };
      }
      return { success: Boolean(r) };
    } catch (e) {
      return { success: false, message: 'Provider error', raw: e && (e.response ? e.response.data : e.message) };
    }
  }

  if (OTP_BYPASS) {
    return { success: true, bypass: true, message: `OTP bypass enabled. Use code ${OTP_TEST_CODE}` };
  }

  return { success: false, message: 'OTP provider not configured on server' };
}

async function callVerifyOtp(phone, otp) {
  if (verifyOtpReal) {
    try {
      const r = await verifyOtpReal(phone, otp);
      if (typeof r === 'boolean') return { success: Boolean(r) };
      if (r && typeof r === 'object') {
        if (typeof r.success === 'boolean') return r;
        return { success: true, raw: r };
      }
      return { success: Boolean(r) };
    } catch (e) {
      return { success: false, message: 'Provider verify error', raw: e && (e.response ? e.response.data : e.message) };
    }
  }

  if (OTP_BYPASS) {
    return { success: String(otp) === String(OTP_TEST_CODE) };
  }

  return { success: false, message: 'OTP provider not configured on server' };
}

/**
 * POST /api/auth/send-otp
 * Body: { phone }
 */
router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body || {};
    if (!phone) return res.status(400).json({ ok: false, message: 'Phone number required' });

    const result = await callSendOtp(phone);

    if (result && result.success) {
      const payload = { ok: true, message: result.message || 'OTP sent' };
      if (result.bypass) payload.bypass = true;
      if (result.txnId) payload.txnId = result.txnId;
      return res.json(payload);
    }

    const msg = result && result.message ? result.message : 'Failed to send OTP';
    const status = (msg && msg.toLowerCase().includes('configured')) ? 501 : 500;
    return res.status(status).json({ ok: false, message: msg, details: result && result.raw ? result.raw : undefined });
  } catch (err) {
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

/**
 * POST /api/auth/verify-otp
 * Body: { phone, otp }
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body || {};
    if (!phone || !otp) return res.status(400).json({ ok: false, message: 'Phone and OTP are required' });

    const result = await callVerifyOtp(phone, otp);
    const ok = result && result.success;

    if (!ok) {
      const msg = result && result.message ? result.message : 'Invalid OTP';
      return res.status(401).json({ ok: false, message: msg, details: result && result.raw ? result.raw : undefined });
    }

    const userPayload = { id: phone, phone, role: 'customer' };
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
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

/**
 * POST /api/auth/login (compat)
 */
router.post('/login', async (req, res) => {
  try {
    const { phone, otp } = req.body || {};
    if (!phone || !otp) return res.status(400).json({ ok: false, message: 'Phone and OTP are required' });

    const result = await callVerifyOtp(phone, otp);
    if (!result || !result.success) return res.status(401).json({ ok: false, message: 'Invalid OTP' });

    const userPayload = { id: phone, phone, role: 'admin' };
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
    // ignore
  }
  return res.json({ ok: true, message: 'Logged out' });
});

module.exports = router;
