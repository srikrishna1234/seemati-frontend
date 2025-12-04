/**
 * backend/src/utils/otpVerifier.js
 * Wrapper: uses MSG91 service when configured; otherwise OTP_BYPASS for dev.
 *
 * Exports:
 *  - sendOtp(phone) -> { success: boolean, message?, txnId?, raw? }
 *  - verifyOtp(phone, otp) -> { success: boolean, message?, raw? }
 */

const msg91 = require('../services/msg91Service');

const OTP_BYPASS = (process.env.OTP_BYPASS || 'false').toLowerCase() === 'true';
const OTP_TEST_CODE = process.env.OTP_TEST_CODE || '1234'; // dev only (4-digit), keep for local

async function sendOtp(phone) {
  if (!phone) return { success: false, message: 'phone missing' };

  if (process.env.MSG91_AUTH_KEY) {
    const r = await msg91.sendOtp(phone);
    if (r && r.success) return { success: true, message: 'OTP sent via MSG91', raw: r.raw };
    return { success: false, message: r && r.error ? r.error : 'MSG91 send failed', raw: r && r.raw };
  }

  if (OTP_BYPASS) {
    // return fake but indicate bypass; do NOT return actual OTP value in production
    return { success: true, message: `OTP bypass enabled. Use ${OTP_TEST_CODE}`, bypass: true };
  }

  return { success: false, message: 'OTP provider not configured on server' };
}

async function verifyOtp(phone, otp) {
  if (!phone || !otp) return { success: false, message: 'phone and otp required' };

  if (process.env.MSG91_AUTH_KEY) {
    const r = await msg91.verifyOtp(phone, otp);
    if (r && r.success) return { success: true, message: 'OTP verified', raw: r.raw };
    return { success: false, message: r && r.error ? r.error : (r && r.raw ? JSON.stringify(r.raw) : 'Invalid or expired OTP'), raw: r && r.raw };
  }

  if (OTP_BYPASS) {
    if (String(otp) === String(OTP_TEST_CODE)) return { success: true, message: 'OTP verified (bypass)' };
    return { success: false, message: 'Invalid OTP (bypass)' };
  }

  return { success: false, message: 'OTP provider not configured on server' };
}

module.exports = { sendOtp, verifyOtp };
