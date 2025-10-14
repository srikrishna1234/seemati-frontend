// backend/scripts/preview_transform.js
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

// ---- preview function: compute new fields but DO NOT write ----
function computeNormalized(doc) {
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

  const rawColors = doc.colors ?? doc.color ?? doc.colorValue ?? null;
  const newColors = normalizeColorsField(rawColors);

  return { newImages, newColors };
}

async function run() {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  // Prompt: choose a single product by _id or by a field. For learners: edit the filter below.
  // Example filters (comment/uncomment as needed):
  // const filter = { name: /Leggings/i }; // find product by name regex
  // const filter = { _id: mongoose.Types.ObjectId('PUT_ID_HERE') }; // exact id
  const filter = {}; // empty = pick the first product in collection

  const doc = await Product.findOne(filter).lean();
  if (!doc) {
    console.error('No product found with filter:', filter);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log('Original document (truncated):');
  console.log(JSON.stringify({
    _id: doc._id,
    images: doc.images,
    thumbnail: doc.thumbnail,
    colors: doc.colors ?? doc.color ?? doc.colorValue
  }, null, 2));

  const { newImages, newColors } = computeNormalized(doc);
  console.log('\nPreview of normalized fields (no DB write):');
  console.log(JSON.stringify({ images: newImages, colors: newColors }, null, 2));

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('Preview error:', err);
  process.exit(1);
});
