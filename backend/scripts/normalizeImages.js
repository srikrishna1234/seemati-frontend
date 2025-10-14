// backend/scripts/normalizeImages.js
// Usage:
// 1) Dry run (no writes):
//    node backend/scripts/normalizeImages.js --dry "<mongo-uri>"
// 2) Run for real (apply changes):
//    node backend/scripts/normalizeImages.js "<mongo-uri>"
// Or if MONGODB_URI is in your .env, you can omit the URI argument.

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

const Product = require('../models/Product');

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry') || argv.includes('-n');
const maybeUri = argv.find(a => a !== '--dry' && a !== '-n');
const MONGO_URI =
  maybeUri ||
  process.env.MONGODB_URI ||
  process.env.MONGO_URL ||
  'mongodb://localhost:27017/seemati';

// --- helpers ---
function makeFilenameFromUrl(url) {
  if (!url) return null;
  try {
    return path.basename(String(url).replace(/^\/+/, '')); // strip leading slashes
  } catch (e) {
    return null;
  }
}

function looksLikeImageObject(item) {
  if (!item) return false;
  if (typeof item === 'object') {
    return 'filename' in item || 'url' in item;
  }
  return false;
}

// --- main ---
async function normalize() {
  console.log(`[normalizeImages] connecting to ${MONGO_URI} (dryRun=${dryRun})`);
  await mongoose.connect(MONGO_URI, {});

  try {
    const cursor = Product.find({}).cursor();
    let scanned = 0;
    let updated = 0;

    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      scanned++;
      const imgs = doc.images || [];

      // Already normalized? skip
      if (imgs.length > 0 && looksLikeImageObject(imgs[0])) {
        continue;
      }

      // Convert strings → objects
      const newImgs = imgs
        .filter(Boolean)
        .map(s => {
          if (typeof s === 'string') {
            const filename = makeFilenameFromUrl(s) || String(s).replace(/^\/+/, '');
            return {
              filename,
              url: s,
              deleted: false,
              deletedAt: undefined
            };
          }
          return null;
        })
        .filter(Boolean);

      if (dryRun) {
        console.log(
          `[dry] would update product ${doc._id} : ${imgs.length} -> ${newImgs.length} image(s)`
        );
      } else {
        doc.images = newImgs;
        await doc.save();
        console.log(
          `[update] product ${doc._id} updated: ${imgs.length} -> ${newImgs.length} image(s)`
        );
      }
      updated++;
    }

    console.log(
      `[normalizeImages] done. scanned=${scanned}, updated=${updated}, dryRun=${dryRun}`
    );
  } catch (err) {
    console.error('[normalizeImages] error', err && err.stack ? err.stack : err);
  } finally {
    await mongoose.disconnect();
  }
}

normalize().catch(err => {
  console.error('Fatal error', err && err.stack ? err.stack : err);
  process.exit(1);
});
