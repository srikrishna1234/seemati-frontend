// scripts/seedProduct.cjs
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI not set. Add it to .env or set env var.');
  process.exit(1);
}

async function run() {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  try {
    const p = new Product({
      title: 'Test Leggings Sample',
      description: 'A sample product for admin testing',
      price: 199,
      sku: 'TEST-001',
      images: ['/images/sample-leggings.png'], // Ensure this file exists in backend/public/images or change path
      stock: 50,
      category: 'Leggings'
    });

    await p.save();
    console.log('Seeded product with id', p._id);
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
