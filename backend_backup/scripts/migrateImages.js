// backend/scripts/migrateImages.js
// Usage:
//   node backend/scripts/migrateImages.js                 # uses MONGODB_URI from .env or default localhost
//   node backend/scripts/migrateImages.js "<mongo-uri>"   # uses provided mongo uri (recommended for Atlas)

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

const Product = require('../models/Product');

let MONGO_URI = process.argv[2] || process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/seemati';

function makeFilenameFromUrl(url) {
  if (!url) return null;
  try {
    return path.basename(url);
  } catch (e) {
    return null;
  }
}

async function migrate() {
  console.log('Connecting to MongoDB:', MONGO_URI);
  await mongoose.connect(MONGO_URI, { /* relying on defaults for modern driver */ });
  console.log('Connected to MongoDB');

  const cursor = Product.find({}).cursor();
  let total = 0;
  let updated = 0;

  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    total++;
    const images = doc.images || [];
    const alreadyMigrated = images.length > 0 && typeof images[0] === 'object' && (images[0].filename || images[0].url);
    if (alreadyMigrated) continue;

    const newImgs = images.map(s => {
      if (!s || typeof s !== 'string') return null;
      const filename = makeFilenameFromUrl(s);
      return {
        filename: filename || s.replace(/^\/+/, ''),
        url: s,
        deleted: false,
        deletedAt: undefined
      };
    }).filter(Boolean);

    doc.images = newImgs;
    await doc.save();
    updated++;
    console.log(`Migrated product ${doc._id} -> ${newImgs.length} images`);
  }

  console.log(`Done. Scanned ${total} products. Migrated ${updated} products.`);
  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration error', err);
  process.exit(1);
});
