// backend/scripts/inspect-products.js
// Prints first N products' thumbnail and images fields for inspection.
// Usage:
//   set MONGO_URI env var then:
//   node inspect-products.js

const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/seemati';
const N = 20;

async function main(){
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  // Try to load real model if available
  let Product;
  try {
    Product = require('../src/models/Product');
    console.log('Loaded Product model from ../src/models/Product');
  } catch (err) {
    console.log('Using fallback model (collection: products).');
    const schema = new mongoose.Schema({}, { strict: false, collection: 'products' });
    Product = mongoose.model('Product', schema);
  }

  const products = await Product.find({}).limit(N).lean();
  console.log(`Printing ${products.length} products (showing _id, thumbnail, images[0..5])`);
  products.forEach(p => {
    const thumb = p.thumbnail;
    const images = Array.isArray(p.images) ? p.images.slice(0,6) : p.images;
    console.log('---');
    console.log('id:', p._id);
    console.log('title:', p.title || '(no title)');
    console.log('thumbnail:', thumb);
    console.log('images:', images);
  });

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch(err => {
  console.error('ERROR', err);
  process.exit(1);
});
