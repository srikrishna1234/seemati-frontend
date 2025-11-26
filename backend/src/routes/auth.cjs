// backend/src/routes/auth.cjs
// CommonJS auth routes using cookie-based JWT (seemati_auth)

'use strict';

const express = require('express');
const router = express.Router();

// Our middleware that verifies JWT from cookie or Bearer header
let adminAuth;
try {
  adminAuth = require('../middleware/adminAuth.cjs');
} catch (e) {
  console.error('[AuthRoutes] could not load adminAuth middleware:', e && e.message ? e.message : e);
  // safer fallback: always deny
  adminAuth = (req, res) => res.status(500).json({ ok: false, message: 'Auth middleware missing' });
}

// GET /api/auth/me
// Returns the JWT payload for the currently authenticated user.
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

// POST /api/auth/logout
// Clears the auth cookie on the client.
router.post('/logout', (req, res) => {
  try {
    // Clear cookie for production domain
    res.clearCookie('seemati_auth', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      domain: '.seemati.in',
      path: '/',
    });
  } catch (err) {
    console.error('[AuthRoutes] logout clearCookie error:', err && err.message ? err.message : err);
  }

  return res.json({ ok: true, message: 'Logged out' });
});

module.exports = router;
