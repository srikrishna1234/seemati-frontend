// backend/src/models/Product.cjs
'use strict';

const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const ProductSchema = new Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, index: true, trim: true },
  description: { type: String, default: '' },
  price: { type: Number, default: 0 },
  mrp: { type: Number, default: 0 },
  compareAtPrice: { type: Number },
  stock: { type: Number, default: 0 },
  sku: { type: String, trim: true },
  brand: { type: String, trim: true },
  category: { type: String, trim: true },
  videoUrl: { type: String, trim: true },
  images: { type: [String], default: [] },        // store image paths like /uploads/xxx.jpg or absolute URLs
  thumbnail: { type: String },
  colors: { type: [String], default: [] },        // <--- ensure colors persist
  sizes: { type: [String], default: [] },         // <--- ensure sizes persist
  tags: { type: [String], default: [] },
  published: { type: Boolean, default: false },
  // meta
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  strict: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// update updatedAt
ProductSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// optionally add indexes
ProductSchema.index({ slug: 1 });

module.exports = mongoose.model('Product', ProductSchema);
