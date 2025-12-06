// backend/src/models/product.cjs
'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

const ProductSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: '' },

    // Pricing
    price: { type: Number, required: true, default: 0 },
    mrp: { type: Number, default: 0 },
    compareAtPrice: { type: Number, default: 0 },

    // Inventory / attributes
    sku: { type: String, default: '' },
    brand: { type: String, default: '' },
    category: { type: String, default: '' },

    // Sizes, colours, etc.
    sizes: [{ type: String }], // e.g. ['S','M','L']
    colors: [{ type: String }],

    // Images & media
    thumbnail: { type: String, default: '' },
    images: [{ type: String }], // array of image paths or urls
    videoUrl: { type: String, default: '' },

    // Flags
    isPublished: { type: Boolean, default: false },
    keep: { type: Boolean, default: false }, // based on your earlier field mention
    remove: { type: Boolean, default: false },

    // Stock (optional)
    stock: { type: Number, default: 0 },

    // Any additional free-form metadata
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
ProductSchema.index({ slug: 1 });
ProductSchema.index({ title: 'text' });

// Safe export for both dev and hot-reload scenarios
module.exports = mongoose.models?.Product || mongoose.model('Product', ProductSchema);
