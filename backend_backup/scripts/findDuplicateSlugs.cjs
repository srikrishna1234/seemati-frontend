// backend/scripts/findDuplicateSlugs.cjs
require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI not found in .env');
  process.exit(2);
}

async function main(){
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  // List indexes on products
  const indexes = await db.collection('products').indexes();
  console.log('Indexes:', indexes);

  // Find counts by slug (including null/empty)
  const dup = await db.collection('products').aggregate([
    { $group: { _id: { slug: "$slug" }, count: { $sum: 1 }, ids: { $push: "$_id" }, titles: { $push: "$title" } } },
    { $match: { "count": { $gt: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();

  console.log('Duplicate slugs (count >1):', JSON.stringify(dup, null, 2));

  // Show documents with slug "cat" (exact)
  const catDocs = await db.collection('products').find({ slug: "cat" }).toArray();
  console.log('Documents with slug "cat":', catDocs.length);
  if (catDocs.length) console.dir(catDocs, { depth: 2 });

  // Show documents where slug is null/empty
  const nullSlug = await db.collection('products').find({ $or: [{ slug: null }, { slug: "" }] }).toArray();
  console.log('null/empty slug docs:', nullSlug.length);
  if (nullSlug.length) console.dir(nullSlug, { depth: 2 });

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch(err => { console.error(err); process.exit(1); });
