// backend/utils/auth.cjs
'use strict';

/**
 * auth.cjs
 * - Middleware to protect routes using JWTs.
 * - Tries cookie (AUTH_COOKIE_NAME) first, then Authorization header.
 * - If no JWT_SECRET is configured, behaves permissively (useful for local dev).
 *
 * Requires:
 *   - process.env.JWT_SECRET
 *   - Optional: process.env.AUTH_COOKIE_NAME (defaults to 'seemati_auth')
 *
 * To use cookie-based tokens, ensure `cookie-parser` is loaded in app.cjs:
 *   const cookieParser = require('cookie-parser');
 *   app.use(cookieParser());
 */

const jwt = require('jsonwebtoken');

module.exports = function requireAuth(req, res, next) {
  const JWT_SECRET = process.env.JWT_SECRET || null;
  const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'seemati_auth';

  // If no JWT_SECRET configured, fall back to permissive behavior (dev)
  if (!JWT_SECRET) {
    return next();
  }

  // Helper: extract token from cookie or Authorization header
  function extractToken(req) {
    // 1) cookie (HttpOnly cookie set by server)
    try {
      if (req.cookies && req.cookies[COOKIE_NAME]) {
        return req.cookies[COOKIE_NAME];
      }
    } catch (e) { /* ignore */ }

    // 2) Authorization: Bearer <token>
    const authHeader = req.headers.authorization || req.headers.Authorization || '';
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }

    return null;
  }

  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ ok: false, error: 'Unauthorized (missing token)' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // Attach minimal user info to request
    req.user = {
      id: payload.sub || null,
      raw: payload
    };
    return next();
  } catch (err) {
    console.error('requireAuth: token verify failed:', err && err.message ? err.message : err);
    return res.status(401).json({ ok: false, error: 'Unauthorized (invalid or expired token)' });
  }
};
