const express = require('express');
const router = express.Router();

// Simple in-memory OTP store for testing
const otpStore = new Map();

router.post('/send', (req, res) => {
  const { phone } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'phone is required' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const ttlMs = 5 * 60 * 1000;
  otpStore.set(phone, { otp, expiresAt: Date.now() + ttlMs });

  console.log(`[OTP SEND] phone=${phone} otp=${otp}`);
  return res.json({ success: true, message: 'OTP sent (check server logs)' });
});

router.post('/verify', (req, res) => {
  const { phone, otp } = req.body || {};
  if (!phone || !otp) return res.status(400).json({ error: 'phone and otp are required' });

  const record = otpStore.get(phone);
  if (!record) return res.status(404).json({ error: 'no OTP found for this phone' });
  if (Date.now() > record.expiresAt) {
    otpStore.delete(phone);
    return res.status(410).json({ error: 'OTP expired' });
  }
  if (record.otp !== otp) return res.status(401).json({ error: 'Invalid OTP' });

  otpStore.delete(phone);
  return res.json({ success: true, message: 'OTP verified' });
});

module.exports = router;
