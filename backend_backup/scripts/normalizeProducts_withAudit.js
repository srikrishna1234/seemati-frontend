// backend/scripts/normalizeProducts_withAudit.js
require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://localhost:4000';
const PLACEHOLDER = `${BACKEND_BASE_URL}/uploads/placeholder.png`;

if (!MONGODB_URI) {
  console.error('MONGODB_URI not set. Aborting.');
  process.exit(1);
}

const productSchema = new mongoose.Schema({}, { strict: false, collection: 'products' });
const Product = mongoose.model('Product', productSchema);
const Audit = mongoose.connection.model ? null : null; // placeholder for TypeScript editors

function normalizeImageValue(img) {
  if (!img) return null;
  if (typeof img === 'string') return img;
  if (typeof img === 'object') {
    const keys = ['url','src','path','filename','file','publicUrl'];
    for (const k of keys) if (img[k]) return img[k];
    return JSON.stringify(img);
  }
  return String(img);
}

function makeAbsoluteUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return `${BACKEND_BASE_URL}${url}`;
  return `${BACKEND_BASE_URL}/uploads/${url}`;
}

function normalizeColorsField(colors) {
  if (!colors) return [];
  if (Array.isArray(colors)) {
    return colors.flatMap(c => {
      if (!c) return [];
      if (typeof c === 'string') {
        if (c.includes(',')) return c.split(',').map(s => ({ name: s.trim() }));
        return [{ name: c }];
      }
      if (typeof c === 'object') {
        const out = {};
        if (c.name) out.name = String(c.name);
        if (c.code) out.code = String(c.code);
        if (!out.code && (c.hex || c.colorCode)) out.code = c.hex || c.colorCode;
        if (!out.name && out.code) out.name = out.code;
        return [out];
      }
      return [{ name: String(c) }];
    }).filter(Boolean);
  }
  if (typeof colors === 'string') {
    return colors.split(',').map(s => ({ name: s.trim() })).filter(Boolean);
  }
  return [{ name: String(colors) }];
}

async function run() {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  // Ensure audit collection handle
  const auditCollection = mongoose.connection.collection('product_migration_audit');

  const cursor = Product.find().cursor();
  let total = 0, changed = 0;

  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    total++;
    const updates = {};

    // images - try multiple possible fields
    let images = doc.images ?? doc.image ?? doc.uploadedImages ?? null;
    if (!images && doc.thumbnail) images = doc.thumbnail;

    let newImages = [];
    if (Array.isArray(images)) newImages = images.map(normalizeImageValue).filter(Boolean);
    else if (images) {
      const nv = normalizeImageValue(images);
      if (nv) newImages = [nv];
    }
    if (newImages.length === 0 && doc.thumbnail) newImages.push(normalizeImageValue(doc.thumbnail));
    newImages = newImages.map(i => makeAbsoluteUrl(i)).filter(Boolean);
    if (newImages.length === 0) newImages = [PLACEHOLDER];

    // colors
    const rawColors = doc.colors ?? doc.color ?? doc.colorValue ?? null;
    const newColors = normalizeColorsField(rawColors);

    const imagesChanged = JSON.stringify(newImages) !== JSON.stringify(doc.images || []);
    const colorsChanged = JSON.stringify(newColors) !== JSON.stringify(doc.colors || []);

    if (imagesChanged || colorsChanged) {
      // write audit: store original doc + what will change + timestamp
      try {
        await auditCollection.insertOne({
          productId: doc._id,
          original: doc,
          willSet: {
            images: imagesChanged ? newImages : undefined,
            colors: colorsChanged ? newColors : undefined,
          },
          migratedAt: new Date()
        });
      } catch (auditErr) {
        console.error('Failed to write audit for', doc._id, auditErr);
        // continue — audit failure shouldn't block migration, but we log it
      }

      if (imagesChanged) updates.images = newImages;
      if (colorsChanged) updates.colors = newColors;
      updates.updatedAt = new Date();

      await Product.updateOne({ _id: doc._id }, { $set: updates });
      changed++;
      console.log(`Updated ${doc._id} imagesChanged:${imagesChanged} colorsChanged:${colorsChanged}`);
    }
  }

  console.log(`Migration complete. Processed: ${total}, Updated: ${changed}`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
