// backend/normalize-slugs-preview.js
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./src/models/Product.cjs');

const MONGO = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;

function slugify(s){
  return String(s || '')
    .normalize('NFKD')                    // decompose accents
    .replace(/[^\w\s-]/g, '')             // remove punctuation
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')                 // spaces -> hyphens
    .replace(/-+/g, '-');                 // collapse repeated hyphens
}

(async () => {
  if (!MONGO) { console.error('No MONGO URI'); process.exit(2); }
  await mongoose.connect(MONGO, { useNewUrlParser:true, useUnifiedTopology:true });

  const docs = await Product.find({}).select('_id title slug sku').lean().exec();
  const existing = new Set(docs.map(d => (d.slug || '').toLowerCase()));
  const suggestions = docs.map(d => {
    // choose baseline for slug: existing slug if present (we'll still show normalized suggestion),
    // else prefer sku if present, else title, else id
    const base = (d.title || d.sku || d._id);
    const suggested = slugify(base);
    return { _id: d._id, title: d.title, sku: d.sku, current: d.slug, suggested };
  });

  console.log('Preview suggestions (existing slugs may be normalized):');
  suggestions.forEach(s => console.log(JSON.stringify(s)));
  await mongoose.disconnect();
  process.exit(0);
})();
