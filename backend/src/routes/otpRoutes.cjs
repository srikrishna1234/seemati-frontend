// backend/src/routes/otpRoutes.cjs
'use strict';

/**
 * OTP routes
 * - POST /api/otp/send   -> sends OTP (uses MSG91 if configured, else you can implement local store)
 * - POST /api/otp/verify -> verifies OTP, issues JWT and optionally sets HttpOnly cookie
 *
 * Environment variables used (all optional except JWT_SECRET for tokens):
 * - JWT_SECRET (recommended) - secret to sign tokens
 * - JWT_EXPIRES_IN (optional, default '7d')
 * - AUTH_COOKIE_NAME (optional, default 'seemati_auth')
 * - CORS_ALLOW_CREDENTIALS (if 'true', route will set HttpOnly cookie)
 * - MSG91_AUTH_KEY (optional) - if present, route will call MSG91 verify/send APIs
 * - MSG91_SENDER (optional) - sender id for send
 *
 * Notes:
 * - If you have a Redis OTP store helper at backend/utils/redis.cjs, this code will attempt to require it.
 * - If you use a different Redis helper path, adapt the require path or the verifyOtpInStore implementation.
 */

const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'please-change-this-in-prod';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'seemati_auth';
const COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 7; // 7 days

// Optional Redis helper (if you have one). Adjust path if different in your project.
let redisClient = null;
try {
  // attempt to require a redis helper file if present
  // path guessed: backend/utils/redis.cjs or backend/src/utils/redis.cjs
  try {
    redisClient = require('../../utils/redis.cjs'); // prefer backend/utils
  } catch (e1) {
    try {
      redisClient = require('../utils/redis.cjs'); // fallback
    } catch (e2) {
      redisClient = null;
    }
  }
  // if the module exports an object (client) or helper with get/set, keep it
} catch (err) {
  redisClient = null;
}

// MSG91 config (verify/send)
const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || '';
const MSG91_SENDER = process.env.MSG91_SENDER || '';
// Note: provider-specific endpoints / params may vary by MSG91 plan - adjust if needed
const MSG91_SEND_URL = 'https://api.msg91.com/api/v5/otp';
const MSG91_VERIFY_URL = 'https://api.msg91.com/api/v5/otp/verify';

// Helper: sign JWT
function signToken(user) {
  const payload = { sub: user.id || user._id || user.phone, phone: user.phone, roles: user.roles || [] };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Helper: try verifying OTP from Redis-based store (if available)
async function verifyOtpInStore(phone, otp) {
  try {
    if (!redisClient) {
      // no redis configured
      return false;
    }

    // Two possible redis helpers: direct redis client or wrapper exposing get
    // Try common variations:
    if (typeof redisClient.get === 'function') {
      // wrapper: get(key)
      const key = `otp:${phone}`;
      const stored = await redisClient.get(key);
      if (!stored) return false;
      // stored may be JSON; compare string
      return String(stored).trim() === String(otp).trim();
    } else if (typeof redisClient.getAsync === 'function') {
      const key = `otp:${phone}`;
      const stored = await redisClient.getAsync(key);
      return String(stored).trim() === String(otp).trim();
    } else if (redisClient.client && typeof redisClient.client.get === 'function') {
      // wrapper with client
      const key = `otp:${phone}`;
      const get = (k) => new Promise((resolve, reject) => {
        redisClient.client.get(k, (err, val) => (err ? reject(err) : resolve(val)));
      });
      const stored = await get(key);
      return String(stored).trim() === String(otp).trim();
    } else {
      // Unknown redis helper shape
      return false;
    }
  } catch (err) {
    console.error('[OTP] verifyOtpInStore error:', err && err.message ? err.message : err);
    return false;
  }
}

// Helper: verify via MSG91 verify endpoint (if MSG91_AUTH_KEY provided)
async function verifyViaMsg91(phone, otp) {
  if (!MSG91_AUTH_KEY) return { ok: false, reason: 'no-msg91-key' };
  try {
    // MSG91 expects mobile in international format; adapt as needed.
    // Using OTP template verification API v5. (Check MSG91 docs for exact params.)
    const payload = {
      otp,
      mobile: phone
    };

    const headers = {
      'Content-Type': 'application/json',
      'authkey': MSG91_AUTH_KEY
    };

    // For some MSG91 plans you may need to send route/template info in different endpoints.
    const url = `${MSG91_VERIFY_URL}/?mobile=${encodeURIComponent(phone)}&otp=${encodeURIComponent(otp)}`;

    // Using GET style verify (some MSG91 endpoints use GET), but we'll try POST and fallback to GET.
    try {
      const resp = await axios.post(MSG91_VERIFY_URL, payload, { headers });
      return { ok: true, providerResponse: resp.data };
    } catch (err) {
      // fallback: try GET with query params (older MSG91 style)
      try {
        const resp2 = await axios.get(url, { headers });
        return { ok: true, providerResponse: resp2.data };
      } catch (err2) {
        console.error('[OTP] MSG91 verify failed (post+get):', err2 && err2.message ? err2.message : err2);
        return { ok: false, reason: err2 && err2.message ? err2.message : 'msg91_verify_failed' };
      }
    }
  } catch (err) {
    console.error('[OTP] verifyViaMsg91 error:', err && err.message ? err.message : err);
    return { ok: false, reason: err && err.message ? err.message : 'msg91_error' };
  }
}

// Helper: send OTP via MSG91 (if configured)
async function sendViaMsg91(phone) {
  if (!MSG91_AUTH_KEY) return { ok: false, reason: 'no-msg91-key' };
  try {
    // MSG91 OTP send endpoint (v5) - check your MSG91 account docs for exact payload/params
    const headers = {
      'Content-Type': 'application/json',
      'authkey': MSG91_AUTH_KEY
    };

    // Many accounts use POST to /api/v5/otp with template or flow. Here we'll attempt a POST with mobile.
    // You should adapt this to your MSG91 template/flow (template id or auth params).
    const payload = { mobile: phone, sender: MSG91_SENDER || undefined };

    try {
      const resp = await axios.post(MSG91_SEND_URL, payload, { headers });
      return { ok: true, providerResponse: resp.data };
    } catch (err) {
      console.warn('[OTP] sendViaMsg91 POST failed, trying GET fallback:', err && err.message ? err.message : err);
      // fallback designs vary; we return failure here but log
      return { ok: false, reason: err && err.message ? err.message : 'msg91_send_failed' };
    }
  } catch (err) {
    console.error('[OTP] sendViaMsg91 error:', err && err.message ? err.message : err);
    return { ok: false, reason: err && err.message ? err.message : 'msg91_error' };
  }
}

// Helper: find or create user - replace this with your Mongoose logic
async function saveOrFindUserByPhone(phone) {
  // Adapt to your user model: find by phone and create if not found
  // Example placeholder (replace with real DB calls)
  try {
    // If you have a User model:
    // const User = require('../../models/User.cjs');
    // let user = await User.findOne({ phone });
    // if (!user) user = await User.create({ phone });
    // return user;
    return { id: `phone_${phone}`, phone, roles: ['customer'] };
  } catch (err) {
    console.error('[OTP] saveOrFindUserByPhone error:', err && err.message ? err.message : err);
    throw err;
  }
}

// ===== Routes =====

// POST /api/otp/send
router.post('/send', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ ok: false, error: 'phone required' });

    // If you have an implementation to send OTP (Redis + local generator), call here.
    // Prefer MSG91 if configured:
    if (MSG91_AUTH_KEY) {
      const result = await sendViaMsg91(phone);
      if (result.ok) {
        return res.json({ ok: true, message: 'OTP sent via MSG91', providerResponse: result.providerResponse });
      } else {
        // still return OK to avoid leaking which numbers are valid; but include provider reason for debug.
        console.warn('[OTP] MSG91 send warning:', result.reason);
        return res.json({ ok: true, message: 'OTP send attempted (MSG91 failure)', providerReason: result.reason });
      }
    }

    // Fallback: no MSG91 configured - you may implement local OTP generation and storage here.
    // For now we return a neutral response
    return res.json({ ok: true, message: 'OTP send (no provider configured) - implement local sender' });
  } catch (err) {
    console.error('[OTP][send] error:', err && err.message ? err.message : err);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
});

// POST /api/otp/verify
router.post('/verify', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ ok: false, error: 'phone and otp required' });

    // 1) Try Redis/local store verification first (fast, preferred if you store OTPs)
    let verified = false;
    if (redisClient) {
      try {
        verified = await verifyOtpInStore(phone, otp);
        if (verified) {
          console.info('[OTP] Verified via local store.');
        }
      } catch (err) {
        console.error('[OTP] local verify exception:', err && err.message ? err.message : err);
        verified = false;
      }
    }

    // 2) If not verified locally, try provider verify (MSG91)
    let providerResponse = null;
    if (!verified && MSG91_AUTH_KEY) {
      const v = await verifyViaMsg91(phone, otp);
      if (v && v.ok) {
        verified = true;
        providerResponse = v.providerResponse;
        console.info('[OTP] Verified via MSG91 provider.');
      } else {
        console.warn('[OTP] MSG91 verify returned not-ok:', v && v.reason ? v.reason : v);
      }
    }

    if (!verified) {
      // optionally return provider info when available to assist debugging (don't leak too much in prod)
      return res.status(401).json({ ok: false, error: 'invalid_or_expired_otp', providerResponse });
    }

    // 3) find or create user
    const user = await saveOrFindUserByPhone(phone);

    // 4) sign token
    const token = signToken(user);

    // 5) set cookie if desired
    const sendAsCookie = String(process.env.CORS_ALLOW_CREDENTIALS || 'false').toLowerCase() === 'true';
    if (sendAsCookie) {
      // Use secure:true in production, sameSite none for cross-site (needed if frontend origin differs)
      res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
        maxAge: COOKIE_MAX_AGE
      });
    }

    // 6) return token and user meta
    return res.json({
      ok: true,
      message: 'verified',
      token,
      user: { id: user.id || user._id || user.phone, phone: user.phone, roles: user.roles || [] },
      providerResponse
    });
  } catch (err) {
    console.error('[OTP][verify] error:', err && err.message ? err.message : err);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
});

module.exports = router;
