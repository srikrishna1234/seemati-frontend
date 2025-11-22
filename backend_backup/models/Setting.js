// backend/models/Setting.js
const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  key: { type: String, required: true, index: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, default: {} }, // store arbitrary JSON
}, { timestamps: true });

// Reuse existing model if it exists (prevents OverwriteModelError in some hosts)
const Setting = (mongoose.models && mongoose.models.Setting)
  ? mongoose.models.Setting
  : mongoose.model('Setting', settingSchema);

module.exports = Setting;
