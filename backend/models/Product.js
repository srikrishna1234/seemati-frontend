// backend/models/Product.js
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String },
  description: { type: String },
  price: { type: Number, default: 0 },
  mrp: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
  brand: { type: String },
  category: { type: String },
  videoUrl: { type: String },
  images: { type: Array, default: [] },
  colors: { type: Array, default: [] },
  sizes: { type: Array, default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Reuse existing model if already registered (helps with hot-reload)
const Product = mongoose.models && mongoose.models.Product
  ? mongoose.models.Product
  : mongoose.model("Product", productSchema);

module.exports = Product;
