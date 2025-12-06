// backend/inspect-slugs.js
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./src/models/Product.cjs');

const MONGO = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;

async function run() {
  if (!MONGO) {
    console.error('No MONGO URI in env.');
    process.exit(2);
  }
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
  const docs = await Product.find({}).limit(50).select('_id title slug sku').lean().exec();
  console.log('Found', docs.length, 'products. Showing up to 50:');
  docs.forEach(d => console.log(JSON.stringify(d)));
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => { console.error(err && err.message); process.exit(3); });
