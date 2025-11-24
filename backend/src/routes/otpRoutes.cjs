// backend/src/routes/otpRoutes.cjs
'use strict';

/**
 * OTP routes (MSG91 v5 compatible)
 *
 * Uses env:
 * - MSG91_AUTH_KEY
 * - MSG91_TEMPLATE_ID
 * - MSG91_COUNTRY_CODE (e.g. "91")
 * - MSG91_SENDER (optional)
 *
 * Also supports Redis local store fallback (optional).
 */

const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'please-change-this-in-prod';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'seemati_auth';
const COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 7; // 7 days

// Optional Redis helper (if present)
let redisClient = null;
try {
  try { redisClient = require('../../utils/redis.cjs'); } catch (e1) { try { redisClient = require('../utils/redis.cjs'); } catch (e2) { redisClient = null; } }
} catch (err) { redisClient = null; }

// MSG91 config
const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || '';
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID || '';
const MSG91_COUNTRY_CODE = (process.env.MSG91_COUNTRY_CODE || '91').replace(/\D/g,''); // digits only
const MSG91_SENDER = process.env.MSG91_SENDER || '';
const MSG91_SEND_URL = 'https://api.msg91.com/api/v5/otp';
const MSG91_VERIFY_URL = 'https://api.msg91.com/api/v5/otp/verify';

// Helpers
function signToken(user) {
  const payload = { sub: user.id || user._id || user.phone, phone: user.phone, roles: user.roles || [] };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function normalizePhoneToInternational(phone) {
  if (!phone) return phone;
  let p = String(phone).trim();
  // If already starts with + or country digits, leave as is (but remove +)
  if (p.startsWith('+')) p = p.slice(1);
  // If p already starts with country code (MSG91_COUNTRY_CODE), assume it's good
  if (MSG91_COUNTRY_CODE && p.startsWith(MSG91_COUNTRY_CODE)) return p;
  // else prepend country code
  return `${MSG91_COUNTRY_CODE}${p}`;
}

// Try local redis store verify (if configured)
async function verifyOtpInStore(phone, otp) {
  try {
    if (!redisClient) return false;
    const key = `otp:${phone}`;
    if (typeof redisClient.get === 'function') {
      const stored = await redisClient.get(key);
      return String(stored).trim() === String(otp).trim();
    } else if (typeof redisClient.getAsync === 'function') {
      const stored = await redisClient.getAsync(key);
      return String(stored).trim() === String(otp).trim();
    } else if (redisClient.client && typeof redisClient.client.get === 'function') {
      const get = (k) => new Promise((resolve, reject) => redisClient.client.get(k, (err, val) => (err ? reject(err) : resolve(val))));
      const stored = await get(key);
      return String(stored).trim() === String(otp).trim();
    }
  } catch (err) {
    console.error('[OTP] verifyOtpInStore error:', err && err.message ? err.message : err);
  }
  return false;
}

// MSG91: send using template_id + mobile (v5)
async function sendViaMsg91(phone) {
  if (!MSG91_AUTH_KEY) return { ok: false, reason: 'no-msg91-key' };
  try {
    const mobile = normalizePhoneToInternational(phone); // eg "919012345678"
    const payload = {
      mobile,
      template_id: MSG91_TEMPLATE_ID || undefined,
      // optionally you can pass variables or flow depending on your MSG91 setup
    };

    const headers = {
      'authkey': MSG91_AUTH_KEY,
      'Content-Type': 'application/json'
    };

    // POST to MSG91 v5 OTP endpoint
    const resp = await axios.post(MSG91_SEND_URL, payload, { headers, timeout: 10000 });
    console.info('[OTP] MSG91 send response:', resp && resp.data ? resp.data : resp.status);
    return { ok: true, providerResponse: resp.data };
  } catch (err) {
    console.error('[OTP] sendViaMsg91 error:', err && (err.response && err.response.data ? err.response.data : err.message));
    const reason = err && err.response && err.response.data ? err.response.data : (err && err.message ? err.message : 'msg91_send_failed');
    return { ok: false, reason };
  }
}

// MSG91 verify using v5 verify endpoint POST { mobile, otp }
async function verifyViaMsg91(phone, otp) {
  if (!MSG91_AUTH_KEY) return { ok: false, reason: 'no-msg91-key' };
  try {
    const mobile = normalizePhoneToInternational(phone);
    const payload = { mobile, otp };
    const headers = {
      'authkey': MSG91_AUTH_KEY,
      'Content-Type': 'application/json'
    };
    const resp = await axios.post(MSG91_VERIFY_URL, payload, { headers, timeout: 10000 });
    console.info('[OTP] MSG91 verify response:', resp && resp.data ? resp.data : resp.status);
    // MSG91 v5 success responses vary; treat HTTP 200 as ok and check response body if needed
    return { ok: true, providerResponse: resp.data };
  } catch (err) {
    console.error('[OTP] verifyViaMsg91 error:', err && (err.response && err.response.data ? err.response.data : err.message));
    const reason = err && err.response && err.response.data ? err.response.data : (err && err.message ? err.message : 'msg91_verify_failed');
    return { ok: false, reason };
  }
}

// Placeholder user find/create - replace with Mongoose logic
async function saveOrFindUserByPhone(phone) {
  try {
    return { id: `phone_${phone}`, phone, roles: ['customer'] };
  } catch (err) {
    console.error('[OTP] saveOrFindUserByPhone error:', err && err.message ? err.message : err);
    throw err;
  }
}

// Routes

// POST /api/otp/send
router.post('/send', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ ok: false, error: 'phone required' });

    // prefer MSG91 if configured
    if (MSG91_AUTH_KEY && MSG91_TEMPLATE_ID) {
      const result = await sendViaMsg91(phone);
      if (result.ok) {
        return res.json({ ok: true, message: 'OTP sent via MSG91', providerResponse: result.providerResponse });
      } else {
        console.warn('[OTP] MSG91 send failed:', result.reason);
        // still return ok (neutral) but include provider reason for debug
        return res.json({ ok: true, message: 'OTP send attempted (MSG91 failure)', providerReason: result.reason });
      }
    }

    // If MSG91 not configured properly: fallback to Redis local generator if available
    if (redisClient) {
      try {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const key = `otp:${phone}`;
        // store with expiry 5 minutes
        if (typeof redisClient.set === 'function') {
          await redisClient.set(key, otp, 'EX', 300);
        } else if (typeof redisClient.setAsync === 'function') {
          await redisClient.setAsync(key, otp, 'EX', 300);
        } else if (redisClient.client && typeof redisClient.client.set === 'function') {
          redisClient.client.set(key, otp, 'EX', 300, (err) => { if (err) console.error('[OTP] redis set error', err); });
        }
        // log OTP for dev (not for production)
        console.info(`[OTP][local] OTP for ${phone}: ${otp}`);
        return res.json({ ok: true, message: 'OTP sent (local)', debug: process.env.NODE_ENV !== 'production' ? { otp } : undefined });
      } catch (err) {
        console.error('[OTP] local send error:', err && err.message ? err.message : err);
        return res.status(500).json({ ok: false, error: 'local_send_failed' });
      }
    }

    // No provider & no redis: neutral response
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

    // try local store first
    let verified = false;
    let providerResponse = null;
    if (redisClient) {
      try {
        verified = await verifyOtpInStore(phone, otp);
        if (verified) console.info('[OTP] Verified via local store');
      } catch (err) { console.error('[OTP] local verify error:', err && err.message ? err.message : err); }
    }

    // try MSG91 verify if not verified locally
    if (!verified && MSG91_AUTH_KEY) {
      const v = await verifyViaMsg91(phone, otp);
      if (v && v.ok) {
        verified = true;
        providerResponse = v.providerResponse;
        console.info('[OTP] Verified via MSG91 provider');
      } else {
        console.warn('[OTP] MSG91 verify failed:', v && v.reason ? v.reason : v);
      }
    }

    if (!verified) {
      return res.status(401).json({ ok: false, error: 'invalid_or_expired_otp', providerResponse });
    }

    // find/create user
    const user = await saveOrFindUserByPhone(phone);

    // sign token
    const token = signToken(user);

    // set cookie if requested
    const sendAsCookie = String(process.env.CORS_ALLOW_CREDENTIALS || 'false').toLowerCase() === 'true';
    if (sendAsCookie) {
      res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
        maxAge: COOKIE_MAX_AGE
      });
    }

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
