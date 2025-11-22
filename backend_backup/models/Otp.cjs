// backend/models/Otp.cjs
const mongoose = require("mongoose");

const OtpSchema = new mongoose.Schema({
  phone: { type: String, required: true, index: true },
  codeHash: { type: String, required: true }, // hashed OTP (sha256)
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
});

// TTL: remove expired OTP docs automatically. 0 = expire at 'expiresAt' value.
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Otp", OtpSchema);
