"use strict";

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, trim: true, unique: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true, default: 0 },
  mrp: { type: Number, default: 0 },
  compareAtPrice: { type: Number, default: 0 },
  sku: { type: String, default: '' },
  brand: { type: String, default: '' },
  category: { type: String, default: '' },
  tags: [String],

  // frontend expects an array of STRINGS
  thumbnail: { type: String, default: '' },
  images: { type: [String], default: [] },
    // Sizes (checkbox + custom)
  sizes: {
    type: [String],
    default: []
  },

  // Colors [{ name, hex }]
  colors: {
    type: [
      {
        name: { type: String, required: true },
        hex: { type: String, required: true }
      }
    ],
    default: []
  },

  // Optional product video (YouTube)
  videoUrl: {
    type: String,
    default: ""
  },

  stock: { type: Number, default: 0 },
  published: { type: Boolean, default: false },

  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, {
  timestamps: true,
  versionKey: false
});

// Correct safe model export
module.exports = mongoose.model("Product", productSchema);
