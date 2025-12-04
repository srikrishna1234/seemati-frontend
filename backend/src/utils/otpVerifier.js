/**
 * backend/src/utils/otpVerifier.js
 * OTP verifier module — uses msg91Service when configured,
 * otherwise allows explicit OTP_BYPASS for local testing.
 */

const msg91 = require('../services/msg91Service');

const OTP_BYPASS = (process.env.OTP_BYPASS || 'false').toLowerCase() === 'true';

async function sendOtp(phone) {
  if (!phone) {
    return { success: false, message: 'phone missing' };
  }

  // Prefer real provider when configured
  if (process.env.MSG91_AUTH_KEY) {
    try {
      const r = await msg91.sendOtp(phone);
      if (r && r.success) {
        return { success: true, message: 'OTP sent via MSG91', raw: r.raw, txnId: (r.raw && (r.raw.txnId || r.raw.txn_id)) || null };
      }
      // provider responded but reported failure
      return { success: false, message: r && (r.message || 'MSG91 failure'), raw: r && (r.raw || r.error) };
    } catch (err) {
      return { success: false, message: 'MSG91 error', raw: err && (err.response ? err.response.data : err.message) };
    }
  }

  // No provider — use bypass only when explicitly enabled
  if (OTP_BYPASS) {
    console.warn('[otpVerifier] MSG91 key missing — using OTP_BYPASS.');
    return { success: true, message: 'OTP bypass (testing)', raw: { txnId: 'bypass-' + Date.now() }, txnId: 'bypass-' + Date.now() };
  }

  return { success: false, message: 'OTP provider not configured on server' };
}

module.exports = { sendOtp };
