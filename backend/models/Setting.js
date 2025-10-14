// backend/models/Setting.js
const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  key: { type: String, required: true, index: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, default: {} }, // store arbitrary JSON
}, { timestamps: true });

module.exports = mongoose.model('Setting', settingSchema);
