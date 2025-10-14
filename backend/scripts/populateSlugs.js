// scripts/populateSlugs.js
require('dotenv').config(); // loads .env
const mongoose = require('mongoose');
const Product = require('../models/Product');

const MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI not set. Add it to .env or set env var.');
  process.exit(1);
}

function makeSlug(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // remove non-word chars
    .replace(/\s+/g, '-')     // spaces -> hyphen
    .replace(/-+/g, '-');     // collapse dashes
}

async function run() {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  try {
    // find products missing slug or with empty slug
    const products = await Product.find({ $or: [{ slug: { $exists: false } }, { slug: '' }] });
    console.log(`Found ${products.length} products needing slugs`);

    for (const p of products) {
      const base = makeSlug(p.title || p.name || `product-${p._id}`);
      let slug = base || `product-${p._id}`;
      let counter = 1;

      // ensure uniqueness (exclude current doc)
      while (await Product.findOne({ slug, _id: { $ne: p._id } })) {
        slug = `${base}-${counter++}`;
      }

      p.slug = slug;
      await p.save();
      console.log(`Updated ${p._id} -> ${slug}`);
    }

    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
