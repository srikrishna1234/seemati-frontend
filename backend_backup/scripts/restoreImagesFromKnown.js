// backend/scripts/restoreImagesFromKnown.js
// Run from project root:
// node backend/scripts/restoreImagesFromKnown.js "<mongo-uri>"
// or set MONGODB_URI in .env and run: node backend/scripts/restoreImagesFromKnown.js

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const MONGO_URI = process.argv[2] || process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/seemati';

async function restore() {
  console.log('Connecting to MongoDB:', MONGO_URI);
  await mongoose.connect(MONGO_URI);

  // Map of productId -> array of image URLs (these come from the earlier GET output you posted)
  // If you have more products to restore, add them here in the same format.
  const restoreMap = {
    '68c577b715d649ff9ea3f7f6': ['/images/1758029192509-742756688-pan-card-new.jpg'],
    '68c6375e1a651771d0491955': [], // originally empty
    '68c6a36145cb211c0011ddbe': ['/images/placeholder.png']
  };

  let changed = 0;
  for (const [pid, urls] of Object.entries(restoreMap)) {
    const prod = await Product.findById(pid);
    if (!prod) {
      console.warn('Product not found, skipping:', pid);
      continue;
    }

    // If product already has images subdocs, skip (to avoid double-updating)
    const hasSubdocs = Array.isArray(prod.images) && prod.images.length > 0 && typeof prod.images[0] === 'object';
    if (hasSubdocs) {
      console.log('Product already has image subdocs, skipping:', pid);
      continue;
    }

    // Build subdoc objects from urls
    const newImgs = urls.filter(Boolean).map(u => {
      const filename = (u && u.toString()) ? u.toString().replace(/^\/+images\/?/, '').replace(/^\/+/, '') : null;
      return {
        filename: filename || (u ? String(u).replace(/^\/*/, '') : ''),
        url: u,
        deleted: false,
        deletedAt: undefined
      };
    });

    prod.images = newImgs;
    await prod.save();
    console.log(`Restored product ${pid} -> ${newImgs.length} images`);
    changed++;
  }

  console.log(`Done. Updated ${changed} product(s).`);
  await mongoose.disconnect();
  process.exit(0);
}

restore().catch(err => {
  console.error('Restore error', err);
  process.exit(1);
});
