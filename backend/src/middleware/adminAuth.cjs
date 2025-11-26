// backend/src/middleware/adminAuth.cjs
// CommonJS authentication middleware that supports BOTH cookie and Bearer header.

'use strict';

const jwt = require('jsonwebtoken');

module.exports = function adminAuth(req, res, next) {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error('[adminAuth] ERROR: JWT_SECRET missing in environment');
    return res.status(500).json({ ok: false, message: 'Server misconfigured' });
  }

  let token = null;

  // 1) Try cookie first (preferred)
  if (req.cookies && req.cookies.seemati_auth) {
    token = req.cookies.seemati_auth;
    // console.log('[adminAuth] Using token from cookie');
  }

  // 2) If no cookie, try Authorization header
  if (!token) {
    const authHeader = req.headers.authorization || req.headers.Authorization || '';
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
      // console.log('[adminAuth] Using token from Authorization header');
    }
  }

  // 3) If still no token → reject
  if (!token) {
    console.warn('[adminAuth] No token found in cookie or Bearer header');
    return res.status(401).json({ ok: false, message: 'Unauthorized' });
  }

  // 4) Verify JWT
  try {
    const payload = jwt.verify(token, secret);

    // attach user payload for next handlers
    req.user = payload;

    return next();
  } catch (err) {
    console.error('[adminAuth] JWT verification failed:', err.message);
    return res.status(401).json({ ok: false, message: 'Unauthorized' });
  }
};
