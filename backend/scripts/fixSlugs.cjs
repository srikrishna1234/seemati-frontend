// backend/scripts/fixSlugs.cjs
// Usage: from backend folder: node scripts/fixSlugs.cjs
// Make sure MONGO_URI env var is set or edit the connection string below.

const mongoose = require('mongoose');
const path = require('path');

async function main() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/seemati';
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  // Load Product model (adjust path if different)
  const prodPath = path.join(__dirname, '..', 'models', 'Product.js');
  let Product = require(prodPath);
  Product = Product && (Product.default || Product);

  if (!Product) {
    console.error('Product model not found at', prodPath);
    process.exit(1);
  }

  function slugify(input) {
    if (!input) return null;
    const s = String(input).toLowerCase();
    return s
      .replace(/[\u2000-\u206F\u2E00-\u2E7F'!"#$%&()*+,./:;<=>?@\[\\\]^`{|}~]+/g, '-')
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/--+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // 1) Fix null / empty slugs
  const problematic = await Product.find({ $or: [{ slug: null }, { slug: '' }, { slug: { $exists: false } }] }).lean().exec();
  console.log('Found', problematic.length, 'products with null/empty/missing slug');

  async function slugExists(slug) {
    return !!(await Product.findOne({ slug }).lean().exec());
  }

  for (const doc of problematic) {
    const base = slugify(doc.title || (`prod-${String(doc._id).slice(-6)}`)) || `p-${String(doc._id).slice(-6)}`;
    let slug = base;
    let i = 0;
    while (await slugExists(slug)) {
      i += 1;
      slug = `${base}-${i}`;
      if (i > 5000) {
        slug = `${base}-${Date.now().toString().slice(-6)}`;
        break;
      }
    }

    try {
      await Product.updateOne({ _id: doc._id }, { $set: { slug } }).exec();
      console.log('Updated', doc._id, '->', slug);
    } catch (err) {
      console.error('Failed to update', doc._id, err && err.message ? err.message : err);
    }
  }

  // 2) Fix duplicates: find slugs with >1 docs, keep one, re-slug others
  const dupAgg = await Product.aggregate([
    { $match: { slug: { $ne: null, $ne: '' } } },
    { $group: { _id: '$slug', count: { $sum: 1 }, ids: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } }
  ]).exec();

  if (dupAgg && dupAgg.length) {
    console.log('Found duplicate slug groups:', dupAgg.length);
    for (const group of dupAgg) {
      const ids = group.ids.map(id => String(id));
      // keep the first id, re-slug the rest
      const keep = ids.shift();
      for (const id of ids) {
        const doc = await Product.findById(id).lean().exec();
        if (!doc) continue;
        const base = slugify(doc.title || (`prod-${String(doc._id).slice(-6)}`)) || `p-${String(doc._id).slice(-6)}`;
        let slug = base;
        let i = 0;
        while (await slugExists(slug)) {
          i += 1;
          slug = `${base}-${i}`;
          if (i > 5000) {
            slug = `${base}-${Date.now().toString().slice(-6)}`;
            break;
          }
        }
        try {
          await Product.updateOne({ _id: doc._id }, { $set: { slug } }).exec();
          console.log('Resolved duplicate for', doc._id, '->', slug);
        } catch (err) {
          console.error('Failed to update duplicate doc', doc._id, err && err.message ? err.message : err);
        }
      }
    }
  } else {
    console.log('No duplicate slugs found.');
  }

  // 3) Ensure unique index exists on slug
  try {
    // This will fail if duplicate slugs still exist, so run after fixes above
    await mongoose.connection.collection('products').createIndex({ slug: 1 }, { unique: true });
    console.log('Created unique index on slug.');
  } catch (err) {
    console.error('Could not create unique index on slug (maybe duplicates remain):', err && err.message ? err.message : err);
  }

  await mongoose.disconnect();
  console.log('Done. Disconnected.');
  process.exit(0);
}

main().catch(err => {
  console.error('Script error', err && err.stack ? err.stack : err);
  process.exit(1);
});
