// backend/scripts/attachImagesByFilename.js
// Usage (dry-run): node attachImagesByFilename.js "<MONGO_URI>"
// To apply changes: node attachImagesByFilename.js "<MONGO_URI>" --apply

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

if (process.argv.length < 3) {
  console.error('Usage: node attachImagesByFilename.js "<MONGO_URI>" [--apply]');
  process.exit(2);
}
const MONGO_URI = process.argv[2];
const APPLY = process.argv.includes('--apply');

const IMAGES_DIR = path.join(__dirname, '..', 'public', 'images'); // script lives in backend/scripts
const Product = require('../models/Product');

async function main() {
  console.log('Connecting to Mongo:', MONGO_URI);
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected.');

  const files = fs.readdirSync(IMAGES_DIR).filter(f => !f.startsWith('.'));
  console.log('Found files in images folder:', files);

  const products = await Product.find({}).lean();
  console.log('Loaded products:', products.length);

  let changed = 0;
  for (const p of products) {
    const imgs = Array.isArray(p.images) ? p.images : [];
    if (imgs.length > 0) continue; // skip already populated

    const slug = (p.slug || '').toLowerCase();
    const title = (p.title || '').toLowerCase();

    let match = null;
    if (slug) {
      match = files.find(f => f.toLowerCase().includes(slug));
    }
    if (!match && title) {
      const words = title.split(/\s+/).filter(Boolean).slice(0,3);
      for (const w of words) {
        match = files.find(f => f.toLowerCase().includes(w));
        if (match) break;
      }
    }
    if (!match && files.includes('placeholder.png')) match = 'placeholder.png';

    if (match) {
      const imgObj = { filename: match, url: '/images/' + match, deleted:false, deletedAt:null };
      console.log(`Product ${p._id} "${p.title}" -> WOULD add image: ${match}`);
      if (APPLY) {
        const doc = await Product.findById(p._id);
        doc.images = doc.images || [];
        doc.images.push(imgObj);
        await doc.save();
        console.log(' -> Applied update for', p._id);
        changed++;
      }
    } else {
      console.log(`Product ${p._id} "${p.title}" -> NO MATCH`);
    }
  }

  console.log(`Done. changed=${changed}. APPLY=${APPLY}`);
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
