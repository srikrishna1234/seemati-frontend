// backend/models/Product.js
import mongoose from "mongoose";

const { Schema } = mongoose;

function slugify(input) {
  if (!input) return '';
  const s = String(input).toLowerCase();
  return s
    .replace(/[\u2000-\u206F\u2E00-\u2E7F'!"#$%&()*+,./:;<=>?@\[\\\]^`{|}~]+/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Helper to ensure unique slug, used in pre-validate hook
async function ensureUniqueSlugForModel(Model, base, excludeId) {
  let baseSlug = base ? String(base).trim() : '';
  if (!baseSlug) baseSlug = String(new mongoose.Types.ObjectId()).slice(0, 8);
  baseSlug = slugify(baseSlug) || String(new mongoose.Types.ObjectId()).slice(0, 8);

  let slug = baseSlug;
  let i = 0;
  const existsQuery = (candidate) => {
    if (!excludeId) return { slug: candidate };
    try {
      return { slug: candidate, _id: { $ne: mongoose.Types.ObjectId(String(excludeId)) } };
    } catch (e) {
      return { slug: candidate, _id: { $ne: excludeId } };
    }
  };

  // loop until unique (should break quickly)
  while (await Model.exists(existsQuery(slug))) {
    i += 1;
    slug = `${baseSlug}-${i}`;
    if (i > 5000) {
      slug = `${baseSlug}-${String(new mongoose.Types.ObjectId()).slice(-6)}`;
      break;
    }
  }
  return slug;
}

const ImageSchema = new Schema({
  filename: { type: String },
  url: { type: String },
  deleted: { type: Boolean, default: false },
}, { _id: true });

const ProductSchema = new Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  price: { type: Number, default: 0 },
  mrp: { type: Number, default: 0 },
  sku: { type: String, default: '' },
  stock: { type: Number, default: 0 },
  brand: { type: String, default: '' },
  category: { type: String, default: '' },
  images: { type: [ImageSchema], default: [] },
  colors: { type: [String], default: [] },
  sizes: { type: [String], default: [] },
  videoUrl: { type: String, default: '' },
  deleted: { type: Boolean, default: false },

  // ratings: store integer values 1..5
  ratings: {
    type: [Number],
    default: []
  },

  // slug: required unique identifier used in URLs
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  }
}, { timestamps: true });

// Pre-validate hook: guarantee slug exists and is unique before validating/saving
ProductSchema.pre('validate', async function (next) {
  try {
    // 'this' is the document being saved
    if (!this.slug || String(this.slug).trim() === '' || String(this.slug).toLowerCase() === 'null') {
      const baseFromTitle = (this.title && String(this.title).trim()) ? this.title : String(this._id || '').slice(-6);
      const generated = await ensureUniqueSlugForModel(mongoose.models.Product || mongoose.model('Product', ProductSchema), baseFromTitle, this._id);
      this.slug = String(generated);
    } else {
      // slug present: normalize and ensure uniqueness (exclude current id)
      const normalized = slugify(this.slug || '');
      if (normalized !== this.slug) this.slug = normalized || this.slug;
      // ensure uniqueness: if someone else has the slug, generate unique variant
      const conflict = await (mongoose.models.Product || mongoose.model('Product', ProductSchema)).exists({ slug: this.slug, _id: { $ne: this._id } });
      if (conflict) {
        const generated = await ensureUniqueSlugForModel(mongoose.models.Product || mongoose.model('Product', ProductSchema), this.slug, this._id);
        this.slug = String(generated);
      }
    }
    return next();
  } catch (err) {
    console.error('[ProductSchema] pre-validate slug generation error:', err && err.message ? err.message : err);
    return next(err);
  }
});

// Virtual: average rating
ProductSchema.virtual('ratingAvg').get(function () {
  if (!Array.isArray(this.ratings) || this.ratings.length === 0) return 0;
  const sum = this.ratings.reduce((s, v) => s + Number(v || 0), 0);
  return sum / this.ratings.length;
});

ProductSchema.virtual('ratingCount').get(function () {
  return Array.isArray(this.ratings) ? this.ratings.length : 0;
});

// Ensure virtuals are included when toJSON/toObject
ProductSchema.set('toJSON', { virtuals: true });
ProductSchema.set('toObject', { virtuals: true });

// Export model (support both require() and import)
const Product = mongoose.models?.Product || mongoose.model('Product', ProductSchema);
export default Product;
