// backend/src/models/Product.cjs
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, trim: true, index: true },
  sku: { type: String, trim: true },
  description: { type: String, trim: true },
  price: { type: Number, default: 0 },
  mrp: { type: Number, default: 0 },
  compareAtPrice: { type: Number },
  brand: { type: String, trim: true },
  category: { type: String, trim: true },
  sizes: { type: [String], default: [] },
  colors: { type: [String], default: [] },
  thumbnail: { type: String, default: '' },
  images: { type: [String], default: [] },
  videoUrl: { type: String, default: '' },
  stock: { type: Number, default: 0 },
  isPublished: { type: Boolean, default: false },
  // add any other fields your app uses
}, { timestamps: true });

// Explicit index name to match the index we created earlier
productSchema.index(
  { slug: 1 },
  { unique: true, sparse: true, name: 'slug_unique_sparse' }
);

// Optional: convenience static to generate unique slug using the helper
productSchema.statics.generateUniqueSlug = async function(baseString, options = {}) {
  const generateUniqueSlug = require('../utils/generateUniqueSlug');
  return await generateUniqueSlug(this, baseString, options);
};

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);
