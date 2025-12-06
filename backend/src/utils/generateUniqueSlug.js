// backend/src/utils/generateUniqueSlug.js
// Usage: await generateUniqueSlug(ProductModel, baseString, options)
// Options: { slugField: 'slug', maxAttempts: 1000, collation: null }

const slugify = require('./slugify');

module.exports = async function generateUniqueSlug(Model, baseString, options = {}) {
  const slugField = options.slugField || 'slug';
  const maxAttempts = options.maxAttempts || 1000;
  const collation = options.collation || null;

  let base = slugify(baseString || 'product');
  if (!base) base = 'product';

  let candidate = base;
  let counter = 1;

  // Helper to test existence (respects collation if provided)
  const existsQuery = async (s) => {
    const q = {};
    q[slugField] = s;
    if (collation) {
      return !!(await Model.findOne(q).collation(collation).lean().exec());
    }
    return !!(await Model.findOne(q).lean().exec());
  };

  while (await existsQuery(candidate)) {
    candidate = `${base}-${counter++}`;
    if (counter > maxAttempts) {
      throw new Error('Could not generate unique slug after many attempts');
    }
  }

  return candidate;
};
