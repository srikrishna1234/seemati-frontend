// backend/scripts/fix-broken-uploads.js
// Usage:
// 1) set environment MONGO_URI and API_BASE_URL
// 2) node fix-broken-uploads.js [--dry]
// --dry will only report and not update DB

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const DRY = process.argv.includes('--dry');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/seemati';
const API_BASE = process.env.API_BASE_URL || 'https://api.seemati.in';
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads'); // backend/uploads

async function connectDB() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');
}

async function loadProductModel() {
  try {
    // try your real model path first
    const Product = require('../src/models/Product');
    console.log('Loaded Product model from ../src/models/Product');
    return Product;
  } catch (err) {
    console.log('Could not load ../src/models/Product, using fallback flexible model. Error:', err.message);
    // fallback minimal model using existing products collection
    const schema = new mongoose.Schema({}, { strict: false, collection: 'products' });
    return mongoose.model('Product', schema);
  }
}

function readUploadFiles() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    console.error('Uploads dir not found:', UPLOADS_DIR);
    return [];
  }
  return fs.readdirSync(UPLOADS_DIR);
}

function looksLikeMissingExt(val) {
  if (!val || typeof val !== 'string') return false;
  if (val.startsWith('http')) return false;
  if (/\.[a-zA-Z0-9]{2,5}$/.test(val)) return false;
  // typical filename/id pattern
  if (/^[a-f0-9]{8,}$/.test(val) || /^[A-Za-z0-9\-_]{8,}$/.test(val)) return true;
  return false;
}

async function run() {
  await connectDB();
  const Product = await loadProductModel();
  const files = readUploadFiles();
  console.log('Files in uploads dir:', files.length);

  const products = await Product.find({});
  console.log('Products scanned:', products.length);

  const report = { updated: [], skipped: [], errors: [] };

  for (const p of products) {
    let changed = false;
    const update = {};

    const fixVal = (val) => {
      if (!val || !looksLikeMissingExt(val)) return { fixed: false };
      const match = files.find(f => f.toLowerCase().includes(val.toLowerCase()));
      if (match) {
        const newUrl = `${API_BASE}/uploads/${encodeURIComponent(match)}`;
        return { fixed: true, newUrl, match };
      }
      return { fixed: false };
    };

    try {
      if (p.thumbnail) {
        const r = fixVal(p.thumbnail);
        if (r.fixed) {
          update.thumbnail = r.newUrl;
          changed = true;
          report.updated.push({ productId: p._id, field: 'thumbnail', foundFile: r.match, old: p.thumbnail, new: r.newUrl });
        }
      }

      if (Array.isArray(p.images) && p.images.length) {
        const newImages = [...p.images];
        let any = false;
        for (let i = 0; i < newImages.length; i++) {
          const r = fixVal(newImages[i]);
          if (r.fixed) {
            newImages[i] = r.newUrl;
            any = true;
            report.updated.push({ productId: p._id, field: `images[${i}]`, foundFile: r.match, old: p.images[i], new: newImages[i] });
          }
        }
        if (any) {
          update.images = newImages;
          changed = true;
        }
      }

      if (changed) {
        if (!DRY) {
          await Product.updateOne({ _id: p._id }, { $set: update });
          console.log('Updated product', p._id, update);
        } else {
          console.log('[DRY] Would update', p._id, update);
        }
      } else {
        report.skipped.push({ productId: p._id });
      }
    } catch (err) {
      console.error('Error processing product', p._id, err);
      report.errors.push({ productId: p._id, error: String(err) });
    }
  }

  const outPath = path.join(__dirname, 'fix-report.json');
  fs.writeFileSync(outPath, JSON.stringify({ DRY, API_BASE, updated: report.updated.length, details: report }, null, 2));
  console.log('Report written to', outPath);
  mongoose.disconnect();
  console.log('Done.');
}

run().catch(err => {
  console.error('Fatal error', err);
  process.exit(1);
});
