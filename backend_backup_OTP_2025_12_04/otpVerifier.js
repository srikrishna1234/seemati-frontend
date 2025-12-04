/**
 * backend/src/utils/otpVerifier.js
 *
 * Wrapper that exposes:
 *  - sendOtp(phone) -> { success: boolean, message?, bypass?, txnId?, raw? }
 *  - verifyOtp(phone, otp) -> { success: boolean, message?, raw? }
 *
 * Uses msg91Service when MSG91_AUTH_KEY is present; otherwise supports OTP_BYPASS for dev/testing.
 */

const msg91 = require('../services/msg91Service');

const OTP_BYPASS = (process.env.OTP_BYPASS || 'false').toLowerCase() === 'true';
const OTP_TEST_CODE = process.env.OTP_TEST_CODE || '1234';

async function sendOtp(phone) {
  if (!phone) return { success: false, message: 'phone missing' };

  if (process.env.MSG91_AUTH_KEY) {
    const r = await msg91.sendOtp(phone);
    if (r && r.success) return { success: true, message: r.message || 'OTP sent via MSG91', raw: r.raw, txnId: r.txnId || (r.raw && (r.raw.request_id || r.raw.txnId)) || null };
    return { success: false, message: r && (r.error || r.message) ? (r.error || r.message) : 'MSG91 send failed', raw: r && r.raw ? r.raw : r };
  }

  if (OTP_BYPASS) {
    return { success: true, bypass: true, message: `OTP bypass enabled. Use code ${OTP_TEST_CODE}`, raw: { txnId: 'bypass-' + Date.now() } };
  }

  return { success: false, message: 'OTP provider not configured on server' };
}

async function verifyOtp(phone, otp) {
  if (!phone || !otp) return { success: false, message: 'phone and otp required' };

  if (process.env.MSG91_AUTH_KEY) {
    const r = await msg91.verifyOtp(phone, otp);
    if (r && r.success) return { success: true, message: 'OTP verified', raw: r.raw };
    return { success: false, message: r && (r.error || r.message) ? (r.error || r.message) : (r && r.raw ? JSON.stringify(r.raw) : 'Invalid or expired OTP'), raw: r && r.raw ? r.raw : r };
  }

  if (OTP_BYPASS) {
    if (String(otp) === String(OTP_TEST_CODE)) return { success: true, message: 'OTP verified (bypass)' };
    return { success: false, message: 'Invalid OTP (bypass)' };
  }

  return { success: false, message: 'OTP provider not configured on server' };
}

module.exports = { sendOtp, verifyOtp };
