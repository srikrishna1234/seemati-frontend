// backend/src/routes/auth.cjs
// CommonJS auth routes using cookie-based JWT (seemati_auth)
// Full replacement file

'use strict';

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'; // token lifetime
const COOKIE_NAME = process.env.COOKIE_NAME || 'seemati_auth';
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined; // e.g. ".seemati.in"
const NODE_ENV = process.env.NODE_ENV || 'development';

// Load adminAuth middleware if present, otherwise fallback to a safe stub
let adminAuth;
try {
  adminAuth = require('../middleware/adminAuth.cjs');
} catch (e) {
  console.error('[AuthRoutes] could not load adminAuth middleware:', e && e.message ? e.message : e);
  // safer fallback: deny any authenticated-only requests
  adminAuth = (req, res, next) => {
    return res.status(500).json({ ok: false, message: 'Auth middleware missing' });
  };
}

// NOTE: Replace or implement a real OTP verification util.
// Try to require a real one if present; otherwise use a development stub.
let verifyOtp;
try {
  // If you have something like ../utils/otpVerifier.js, it should export verifyOtp(phone, otp)
  verifyOtp = require('../utils/otpVerifier');
  // If your module exports an object, ensure function is available
  if (typeof verifyOtp !== 'function' && verifyOtp && typeof verifyOtp.verifyOtp === 'function') {
    verifyOtp = verifyOtp.verifyOtp;
  }
} catch (e) {
  console.warn('[AuthRoutes] OTP verifier not found — using fallback dev verifier. Replace with a real verifier for production.');
  verifyOtp = async (phone, otp) => {
    // Dev: accept OTP "1234" or any OTP when NODE_ENV !== 'production'
    if (NODE_ENV === 'production') {
      // In production you must implement the real verifier; reject by default
      return false;
    }
    return otp === '1234' || !!otp; // non-production, allow for testing
  };
}

// Helper: create JWT payload and token
function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Helper: cookie options for Set-Cookie
function makeCookieOptions() {
  const secure = NODE_ENV === 'production'; // secure cookies required in prod for SameSite=None
  const opts = {
    httpOnly: true,
    secure: secure,
    sameSite: 'None', // required for cross-site cookies
    maxAge: parseInt(process.env.COOKIE_MAX_AGE, 10) || 1000 * 60 * 60 * 24 * 7, // 7 days default (ms)
    path: '/',
  };
  if (COOKIE_DOMAIN) {
    opts.domain = COOKIE_DOMAIN;
  }
  return opts;
}

/**
 * POST /api/auth/login
 * Body: { phone, otp }
 *
 * On success: sets cookie (seemati_auth) and returns ok + user payload (excluding sensitive info)
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

    // Build the JWT payload. Adjust fields as needed.
    const userPayload = {
      id: phone, // if you have a DB id, use it here
      phone,
      role: 'admin', // adjust according to your logic
    };

    const token = createToken(userPayload);

    // Set cookie with appropriate options
    const cookieOptions = makeCookieOptions();
    res.cookie(COOKIE_NAME, token, cookieOptions);

    // Return minimal user info for frontend to consume
    return res.json({
      ok: true,
      message: 'Logged in',
      user: {
        id: userPayload.id,
        phone: userPayload.phone,
        role: userPayload.role,
      },
    });
  } catch (err) {
    console.error('[AuthRoutes] /login error:', err && err.message ? err.message : err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

/**
 * GET /api/auth/me
 * Returns the JWT payload for the currently authenticated user.
 * adminAuth middleware should populate req.user
 */
router.get('/me', adminAuth, (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ ok: false, message: 'Unauthorized' });
    }

    // req.user is set by adminAuth to the verified JWT payload
    return res.json({
      ok: true,
      user: req.user,
    });
  } catch (err) {
    console.error('[AuthRoutes] /me error:', err && err.message ? err.message : err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

/**
 * POST /api/auth/logout
 * Clears the auth cookie on the client.
 */
router.post('/logout', (req, res) => {
  try {
    // Clear cookie for production domain / path
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
