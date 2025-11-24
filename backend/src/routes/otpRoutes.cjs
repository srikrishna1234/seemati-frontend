/**
 * backend/src/routes/otpRoutes.cjs
 * Redis-backed OTP routes with rate-limiting and phone normalization.
 */
'use strict';

const express = require('express');
const axios = require('axios');

const router = express.Router();

// config from env (defaults)
const MSG91_AUTHKEY = process.env.MSG91_AUTHKEY || '';
const MSG91_SENDER = process.env.MSG91_SENDER || '';
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID || '';
const MSG91_COUNTRY_CODE = (process.env.MSG91_COUNTRY_CODE || '91').toString().replace(/^\+/, '');
const REDIS_URL = process.env.REDIS_URL || '';
const RATE_LIMIT_MAX = parseInt(process.env.OTP_RATE_LIMIT_MAX || '5', 10); // default 5 sends
const RATE_LIMIT_DURATION = parseInt(process.env.OTP_RATE_LIMIT_WINDOW_SECONDS || (60 * 60), 10); // default 3600s = 1 hour
const OTP_TTL_SECONDS = parseInt(process.env.OTP_TTL_SECONDS || (5 * 60), 10); // default 5 minutes

// fallback in-memory store (only for dev)
const otpMemory = new Map();

// optional redis client and rate limiter
let redis = null;
let useRedis = false;
let rateLimiter = null;

if (REDIS_URL) {
  try {
    const IORedis = require('ioredis');
    redis = new IORedis(REDIS_URL, {
      // sensible timeouts and retry strategy
      connectTimeout: 5000,
      retryStrategy(times) {
        const delay = Math.min(30000, Math.pow(2, times) * 100);
        console.warn(`Redis retry: attempt ${times}, retry in ${delay}ms`);
        return delay;
      },
      // If the REDIS_URL uses rediss://, ioredis enables TLS automatically
    });
    redis.on('connect', () => console.log('Redis connected'));
    redis.on('ready', () => console.log('Redis ready'));
    redis.on('error', (err) => console.error('Redis error:', err && err.message ? err.message : err));
    redis.on('close', () => console.warn('Redis closed'));
    useRedis = true;

    // rate-limiter-flexible (Redis)
    const { RateLimiterRedis } = require('rate-limiter-flexible');
    rateLimiter = new RateLimiterRedis({
      storeClient: redis,
      points: RATE_LIMIT_MAX,
      duration: RATE_LIMIT_DURATION,
      keyPrefix: 'rlflx_otp'
    });

    console.log('OTP: Using Redis for OTP store and rate limiting');
  } catch (err) {
    console.error('OTP: failed to init Redis or limiter, falling back to memory. Error:', err && err.stack ? err.stack : err);
    useRedis = false;
    redis = null;
    rateLimiter = null;
  }
} else {
  console.warn('OTP: REDIS_URL not provided — using in-memory OTP store and simple in-memory limiter (not for production)');
}

// helpers
async function setOtp(phone, otp) {
  if (useRedis && redis) {
    await redis.setex(`otp:${phone}`, OTP_TTL_SECONDS, otp);
    return;
  }
  otpMemory.set(phone, { otp, expiresAt: Date.now() + OTP_TTL_SECONDS * 1000 });
}
async function getOtp(phone) {
  if (useRedis && redis) {
    return await redis.get(`otp:${phone}`);
  }
  const rec = otpMemory.get(phone);
  if (!rec) return null;
  if (Date.now() > rec.expiresAt) {
    otpMemory.delete(phone);
    return null;
  }
  return rec.otp;
}
async function deleteOtp(phone) {
  if (useRedis && redis) {
    await redis.del(`otp:${phone}`);
    return;
  }
  otpMemory.delete(phone);
}

// in-memory rate limiter if redis not present
const inMemoryRate = new Map();
function simpleCheckRateLimit(phone) {
  const now = Date.now();
  const rec = inMemoryRate.get(phone);
  if (!rec || now - rec.firstAt > RATE_LIMIT_DURATION * 1000) {
    inMemoryRate.set(phone, { count: 1, firstAt: now });
    return true;
  }
  if (rec.count >= RATE_LIMIT_MAX) return false;
  rec.count += 1;
  return true;
}

// phone normalization helper
function normalizePhoneInput(rawPhone) {
  if (!rawPhone || typeof rawPhone !== 'string') return null;
  let p = rawPhone.trim();
  // strip non-digit and plus except leading plus
  p = p.replace(/[^\d+]/g, '');
  // if starts with '+', leave as is; else if starts with country code (like 91...) assume it's ok
  if (p.startsWith('+')) return p;
  // if the user typed 10-digit local number (India typical), prepend country code
  const digitsOnly = p.replace(/\D/g, '');
  if (digitsOnly.length === 10) {
    return `+${MSG91_COUNTRY_CODE}${digitsOnly}`;
  }
  // if digitsOnly already contains country code (e.g. 919XXXXXXXXX) and length > 10, prefix with +
  if (digitsOnly.length > 10 && digitsOnly.startsWith(MSG91_COUNTRY_CODE)) {
    return `+${digitsOnly}`;
  }
  // fallback: if it looks like a full international number without +, add +
  if (digitsOnly.length > 10) return `+${digitsOnly}`;
  // otherwise return null (invalid)
  return null;
}

// MSG91 helpers (SendOTP and Verify)
async function sendOtpViaMsg91(phone, otp) {
  // phone passed in should be normalized with leading '+'; provider expects number without +
  const url = 'https://api.msg91.com/api/v5/otp';
  const mobile = phone.replace(/^\+/, '');
  const payload = {
    mobile,
    otp,
    otp_length: otp.length,
    template_id: MSG91_TEMPLATE_ID || undefined,
    sender: MSG91_SENDER || undefined
  };
  Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

  const headers = {
    'Content-Type': 'application/json',
    authkey: MSG91_AUTHKEY
  };

  const res = await axios.post(url, payload, { headers, timeout: 10000 });
  return res.data;
}

async function verifyOtpViaMsg91(phone, otp) {
  const mobile = phone.replace(/^\+/, '');
  const base = 'https://api.msg91.com/api/v5/otp/verify';
  const query = `?mobile=${encodeURIComponent(mobile)}&otp=${encodeURIComponent(otp)}`;
  const url = base + query;
  const headers = { authkey: MSG91_AUTHKEY };
  const res = await axios.get(url, { headers, timeout: 10000 });
  return res.data;
}

/**
 * POST /api/otp/send
 * Body: { phone: string }
 */
router.post('/send', async (req, res) => {
  try {
    const { phone: rawPhone } = req.body || {};
    const normalized = normalizePhoneInput(String(rawPhone || ''));
    if (!normalized) return res.status(400).json({ error: 'phone is required and must be valid' });

    const phone = normalized; // normalized e.g. +919XXXXXXXXX

    // rate limiting (Redis-backed if available)
    if (useRedis && rateLimiter) {
      try {
        await rateLimiter.consume(phone);
      } catch (rlRejected) {
        return res.status(429).json({ error: 'Too many OTP requests. Try again later.' });
      }
    } else {
      if (!simpleCheckRateLimit(phone)) {
        return res.status(429).json({ error: 'Too many OTP requests. Try again later.' });
      }
    }

    // generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await setOtp(phone, otp);

    // send via MSG91 if configured
    if (MSG91_AUTHKEY) {
      try {
        const providerResp = await sendOtpViaMsg91(phone, otp);
        // log provider response (for debugging)
        console.log('[MSG91 SEND] phone=%s provider=%o', phone, providerResp);
        return res.json({ success: true, provider: 'msg91', providerResponse: providerResp, message: 'OTP sent via MSG91' });
      } catch (err) {
        console.error('MSG91 send error, falling back to local store:', err && err.response ? err.response.data : err && err.message ? err.message : err);
        return res.json({ success: true, provider: 'local', message: 'OTP stored locally (MSG91 send failed)' });
      }
    }

    // dev fallback: return OTP in response (only when provider not configured)
    console.warn('MSG91 not configured: returning OTP in response (dev only)');
    return res.json({ success: true, provider: 'local', message: 'OTP generated (dev)', otp });
  } catch (err) {
    console.error('OTP send error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /api/otp/verify
 * Body: { phone: string, otp: string }
 */
router.post('/verify', async (req, res) => {
  try {
    const { phone: rawPhone, otp } = req.body || {};
    const normalized = normalizePhoneInput(String(rawPhone || ''));
    if (!normalized) return res.status(400).json({ error: 'phone and otp are required' });
    if (!otp) return res.status(400).json({ error: 'phone and otp are required' });

    const phone = normalized;

    // Prefer verifying via MSG91 if configured
    if (MSG91_AUTHKEY) {
      try {
        const providerResp = await verifyOtpViaMsg91(phone, otp);
        console.log('[MSG91 VERIFY] phone=%s provider=%o', phone, providerResp);
        if (providerResp && (providerResp.type === 'success' || providerResp.status === 'success' || providerResp.message)) {
          await deleteOtp(phone);
          return res.json({ success: true, provider: 'msg91', providerResponse: providerResp, message: 'OTP verified via MSG91' });
        }
        console.warn('MSG91 verify returned non-success, falling back to local', providerResp);
      } catch (err) {
        console.warn('MSG91 verify failed, falling back to local. Error:', err && err.message ? err.message : err);
      }
    }

    const stored = await getOtp(phone);
    if (!stored) return res.status(404).json({ error: 'no OTP found for this phone' });
    if (stored !== otp) return res.status(401).json({ error: 'Invalid OTP' });

    await deleteOtp(phone);
    return res.json({ success: true, provider: 'local', message: 'OTP verified' });
  } catch (err) {
    console.error('OTP verify error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
