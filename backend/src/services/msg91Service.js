/**
 * backend/src/services/msg91Service.js
 * MSG91 OTP sender + verifier (v5 endpoints).
 * Minimal logging for production.
 */

const axios = require('axios');

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID || null;
const MSG91_COUNTRY_CODE = process.env.MSG91_COUNTRY_CODE || '91';

function normalizePhone(phone) {
  const digits = String(phone).replace(/\D/g, '');
  return digits.startsWith(MSG91_COUNTRY_CODE) ? digits : MSG91_COUNTRY_CODE + digits;
}

async function sendOtp(phone) {
  if (!MSG91_AUTH_KEY) {
    return { success: false, error: 'MSG91 auth key missing' };
  }

  try {
    const mobile = normalizePhone(phone);
    const url = 'https://api.msg91.com/api/v5/otp';
    const payload = { mobile };
    if (MSG91_TEMPLATE_ID) payload.template_id = MSG91_TEMPLATE_ID;

    const headers = { authkey: MSG91_AUTH_KEY, 'Content-Type': 'application/json' };

    const resp = await axios.post(url, payload, { headers, timeout: 20000 });

    const data = resp.data;
    const ok = (data && (data.type === 'success' || data.status === 'success')) || resp.status === 200;
    return ok ? { success: true, raw: data } : { success: false, raw: data };
  } catch (err) {
    const respBody = err.response ? (typeof err.response.data === 'object' ? JSON.stringify(err.response.data) : String(err.response.data)) : null;
    return { success: false, error: err.message, raw: respBody || null };
  }
}

async function verifyOtp(phone, otp) {
  if (!MSG91_AUTH_KEY) {
    return { success: false, error: 'MSG91 auth key missing' };
  }

  try {
    const mobile = normalizePhone(phone);
    const url = 'https://api.msg91.com/api/v5/otp/verify';
    const payload = { mobile, otp };

    const headers = { authkey: MSG91_AUTH_KEY, 'Content-Type': 'application/json' };

    const resp = await axios.post(url, payload, { headers, timeout: 20000 });

    const data = resp.data;
    // MSG91 verification success may be indicated by type/status
    const ok = (data && (data.type === 'success' || data.status === 'success')) || resp.status === 200;
    return ok ? { success: true, raw: data } : { success: false, raw: data };
  } catch (err) {
    const respBody = err.response ? (typeof err.response.data === 'object' ? JSON.stringify(err.response.data) : String(err.response.data)) : null;
    return { success: false, error: err.message, raw: respBody || null };
  }
}

module.exports = { sendOtp, verifyOtp };
