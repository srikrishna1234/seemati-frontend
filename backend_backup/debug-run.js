// backend/debug-run.js
require('dotenv').config();
const mongoose = require('mongoose');

async function tryRun() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/seemati';
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('DEBUG RUN: connected to mongo, readyState=', mongoose.connection.readyState);
  } catch (connErr) {
    console.error('DEBUG RUN: mongo connect error:', connErr && connErr.stack ? connErr.stack : connErr);
    process.exit(1);
  }

  // Try a few common Product model paths
  const tryPaths = [
    './src/models/Product',
    './models/Product',
    './src/models/product',
    './models/product'
  ];

  let Product = null;
  for (const p of tryPaths) {
    try {
      // eslint-disable-next-line global-require, import/no-dynamic-require
      Product = require(p);
      console.log(`DEBUG RUN: Loaded Product model from "${p}"`);
      break;
    } catch (e) {
      console.warn(`DEBUG RUN: require("${p}") failed: ${e && e.message ? e.message : e}`);
    }
  }

  if (!Product) {
    console.error('DEBUG RUN: Product model not found in any tried path:', tryPaths.join(', '));
    console.error('DEBUG RUN: Please tell me where your Product model file is located (example paths: src/models/Product.js or models/Product.js).');
    await mongoose.disconnect();
    process.exit(1);
  }

  try {
    const docs = await Product.find({});
    console.log('DEBUG RUN: Product.find() returned length=', docs.length);
    if (docs.length) console.log('DEBUG RUN: sample doc=', JSON.stringify(docs[0], null, 2));
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('DEBUG RUN: Product.find() error:', err && err.stack ? err.stack : err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

tryRun();
