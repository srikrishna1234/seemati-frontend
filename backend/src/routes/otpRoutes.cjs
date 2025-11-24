// backend/src/routes/otpRoutes.cjs
'use strict';

const express = require('express');
const axios = require('axios');

const router = express.Router();

// config from env (defaults)
const MSG91_AUTHKEY = process.env.MSG91_AUTHKEY || '';
const MSG91_SENDER = process.env.MSG91_SENDER || '';
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID || '';
const MSG91_COUNTRY_CODE = process.env.MSG91_COUNTRY_CODE || '91';
const REDIS_URL = process.env.REDIS_URL || '';
const RATE_LIMIT_MAX = parseInt(process.env.OTP_RATE_LIMIT_MAX || '5', 10); // default 5 sends
const RATE_LIMIT_DURATION = parseInt(process.env.OTP_RATE_LIMIT_WINDOW_SECONDS || (60 * 60), 10); // default 3600s = 1 hour
const OTP_TTL_SECONDS = parseInt(process.env.OTP_TTL_SECONDS || (5 * 60), 10); // default 5 minutes

// fallback in-memory store (only for dev)
const otpMemory = new Map();

// optional redis client and rate limiter
let redis = null;
let useRedis = false;
let RateLimiterRedis = null;
let rateLimiter = null;

if (REDIS_URL) {
  try {
    const IORedis = require('ioredis');
    redis = new IORedis(REDIS_URL);
    redis.on('error', (err) => console.error('Redis error:', err && err.message ? err.message : err));
    useRedis = true;
    console.log('OTP: Using Redis for OTP store and rate limiting');

    // Rate limiter (rate-limiter-flexible)
    const { RateLimiterRedis: RLRedis } = require('rate-limiter-flexible');
    RateLimiterRedis = RLRedis;
    rateLimiter = new RateLimiterRedis({
      storeClient: redis,
      points: RATE_LIMIT_MAX,
      duration: RATE_LIMIT_DURATION,
      keyPrefix: 'rlflx_otp'
    });
  } catch (err) {
    console.error('OTP: Failed to initialize Redis or rate limiter, falling back to in-memory. Error:', err && err.stack ? err.stack : err);
    useRedis = false;
    redis = null;
    rateLimiter = null;
  }
} else {
  console.warn('OTP: REDIS_URL not provided — using in-memory OTP store and simple in-memory limiter (not for production)');
}

// helper functions: set/get/delete OTP
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

// MSG91 helpers (SendOTP and Verify)
async function sendOtpViaMsg91(phone, otp) {
  // Using MSG91 v5 OTP endpoint
  const url = 'https://api.msg91.com/api/v5/otp';
  const mobile = phone.replace(/^\+/, ''); // remove plus if present
  const payload = {
    mobile,
    // provide otp to MSG91 so the provider can send it; remove if you want provider to generate
    otp,
    otp_length: otp.length,
    // include template_id if using templates
    template_id: MSG91_TEMPLATE_ID || undefined,
    sender: MSG91_SENDER || undefined
  };
  // clean undefined keys
  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

  const headers = {
    'Content-Type': 'application/json',
    authkey: MSG91_AUTHKEY
  };

  const res = await axios.post(url, payload, { headers, timeout: 10000 });
  return res.data;
}

async function verifyOtpViaMsg91(phone, otp) {
  const mobile = phone.replace(/^\+/, '');
  // MSG91 verify endpoint
  const url = `https://api.msg91.com/api/v5/otp/verify?mobile=${encodeURIComponent(mobile)}&otp=${encodeURIComponent(otp)}`;
  const headers = { authkey: MSG91_AUTHKEY };
  const res = await axios.get(url, { headers, timeout: 10000 });
  return res.data;
}

// POST /api/otp/send
router.post('/send', async (req, res) => {
  try {
    const { phone } = req.body || {};
    if (!phone) return res.status(400).json({ error: 'phone is required' });

    // rate limiting (Redis-backed if available)
    if (useRedis && rateLimiter) {
      try {
        // key by phone
        await rateLimiter.consume(phone);
      } catch (rlRejected) {
        // rlRejected.msBeforeNext, pointsRemaining etc.
        return res.status(429).json({ error: 'Too many OTP requests. Try again later.' });
      }
    } else {
      // simple in-memory limiter
      if (!simpleCheckRateLimit(phone)) {
        return res.status(429).json({ error: 'Too many OTP requests. Try again later.' });
      }
    }

    // generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // store OTP in Redis or memory
    await setOtp(phone, otp);

    // Send via MSG91 if configured
    if (MSG91_AUTHKEY) {
      try {
        const resp = await sendOtpViaMsg91(phone, otp);
        // Return provider response (but do not return OTP itself in production)
        return res.json({ success: true, provider: 'msg91', providerResponse: resp, message: 'OTP sent via MSG91' });
      } catch (err) {
        console.error('MSG91 send failed:', err && err.response ? err.response.data : err && err.message ? err.message : err);
        // fallback: keep OTP in store and respond success (but flag fallback)
        return res.json({ success: true, provider: 'local', message: 'OTP stored locally (MSG91 send failed)' });
      }
    }

    // no MSG91 configured -> development behavior: return OTP (remove in prod)
    console.warn('MSG91 not configured: returning OTP in response (development only). Remove in production.');
    return res.json({ success: true, provider: 'local', message: 'OTP generated (dev)', otp });
  } catch (err) {
    console.error('OTP send error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/otp/verify
router.post('/verify', async (req, res) => {
  try {
    const { phone, otp } = req.body || {};
    if (!phone || !otp) return res.status(400).json({ error: 'phone and otp are required' });

    // Prefer verifying via MSG91 if configured
    if (MSG91_AUTHKEY) {
      try {
        const resp = await verifyOtpViaMsg91(phone, otp);
        // Interpret MSG91 success. Docs vary; treat 200 as success, but check resp.
        if (resp && (resp.type === 'success' || resp.message || resp.status === 'success')) {
          // ensure local key is removed
          await deleteOtp(phone);
          return res.json({ success: true, provider: 'msg91', providerResponse: resp, message: 'OTP verified via MSG91' });
        }
        // if MSG91 returned not-success, fall through to local check
        console.warn('MSG91 verify returned non-success, falling back to local check', resp);
      } catch (err) {
        console.warn('MSG91 verify failed, falling back to local. Error:', err && err.message ? err.message : err);
        // fall back to local
      }
    }

    // local verification (Redis or memory)
    const stored = await getOtp(phone);
    if (!stored) return res.status(404).json({ error: 'no OTP found for this phone' });
    if (stored !== otp) return res.status(401).json({ error: 'Invalid OTP' });

    // success
    await deleteOtp(phone);
    return res.json({ success: true, provider: 'local', message: 'OTP verified' });
  } catch (err) {
    console.error('OTP verify error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
