// backend/normalize-slugs-apply.js
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./src/models/Product.cjs');

const MONGO = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;

function slugify(s){
  return String(s || '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

(async () => {
  if (!MONGO) { console.error('No MONGO URI'); process.exit(2); }
  await mongoose.connect(MONGO, { useNewUrlParser:true, useUnifiedTopology:true });

  const docs = await Product.find({}).select('_id title slug sku').lean().exec();

  // Build a set of existing slugs (after normalization) to check collisions
  const used = new Set();
  for (const d of docs) {
    if (d.slug) used.add(slugify(d.slug));
  }

  let updates = 0;
  for (const d of docs) {
    const baseline = d.slug && String(d.slug).trim() ? d.slug : (d.sku && d.sku.trim() ? d.sku : d.title || String(d._id));
    let candidate = slugify(baseline);

    // If candidate is empty for some reason, fall back to id
    if (!candidate) candidate = String(d._id);

    // ensure uniqueness by appending -1, -2, ...
    if (used.has(candidate)) {
      let i = 1;
      let newCandidate = `${candidate}-${i}`;
      while (used.has(newCandidate)) {
        i++;
        newCandidate = `${candidate}-${i}`;
      }
      candidate = newCandidate;
    }

    // Only update if different (case-insensitive)
    const currentNormalized = d.slug ? slugify(d.slug) : '';
    if (currentNormalized !== candidate) {
      // Update the document
      await Product.updateOne({ _id: d._id }, { $set: { slug: candidate } }).exec();
      console.log(`Updated ${d._id} => ${candidate} (was: ${d.slug})`);
      updates++;
    } else {
      // If same, still ensure the set contains it
      used.add(candidate);
    }
    used.add(candidate);
  }

  console.log('Total updated:', updates);
  await mongoose.disconnect();
  process.exit(0);
})();
