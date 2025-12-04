/**
 * backend/src/services/msg91Service.js
 * Verbose MSG91 wrapper for debugging.
 * Logs sanitized provider responses (no auth key printed).
 */

const axios = require('axios');

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID || null;
const MSG91_COUNTRY_CODE = process.env.MSG91_COUNTRY_CODE || '91';

async function sendOtp(phone) {
  if (!MSG91_AUTH_KEY) {
    console.warn('[msg91Service] MSG91_AUTH_KEY missing');
    return { success: false, error: 'MSG91 auth key missing' };
  }

  try {
    // OTP v5 endpoint (adjust if your account uses a different API)
    const url = 'https://api.msg91.com/api/v5/otp';
    const payload = { mobile: phone };
    if (MSG91_TEMPLATE_ID) payload.template_id = MSG91_TEMPLATE_ID;

    const headers = { authkey: MSG91_AUTH_KEY, 'Content-Type': 'application/json' };

    // Log non-sensitive request metadata
    console.log('[msg91Service] Sending OTP request', { url, payload: payload, hasTemplateId: !!MSG91_TEMPLATE_ID });

    const resp = await axios.post(url, payload, { headers, timeout: 20000 });

    // Log sanitized provider response
    try {
      console.log('[msg91Service] MSG91 response status=', resp.status, 'data=', typeof resp.data === "object" ? JSON.stringify(resp.data) : String(resp.data));
    } catch (e) {
      console.log('[msg91Service] MSG91 response (stringify failed)', String(resp.data));
    }

    const data = resp.data;
    const ok = (data && (data.type === 'success' || data.status === 'success')) || resp.status === 200;
    if (ok) return { success: true, raw: data };
    return { success: false, raw: data };

  } catch (err) {
    // Extract response body if present
    const status = err.response ? err.response.status : null;
    const respBody = err.response ? (typeof err.response.data === 'object' ? JSON.stringify(err.response.data) : String(err.response.data)) : null;

    console.error('[msg91Service] error sending OTP', {
      message: err.message,
      status: status,
      respBody: respBody
    });

    return { success: false, error: err.message, raw: respBody || null };
  }
}

module.exports = { sendOtp };
