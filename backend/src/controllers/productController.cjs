// backend/src/controllers/productController.js
// Simple CommonJS controller shim for adminProduct routes.
// Tries to load a Mongoose Product model if present and falls back to an in-memory stub.
// Exports: listProducts, createProduct, getProduct, updateProduct, deleteProduct

'use strict';

const { createRequire } = require('module');
const requireLocal = createRequire(__filename);

let ProductModel = null;
function tryLoadModel() {
  if (ProductModel) return ProductModel;
  const candidates = [
    '../../models/productModel.cjs',
    '../../models/productModel.js',
    '../models/productModel.cjs',
    '../models/productModel.js',
    './models/productModel.cjs',
    './models/productModel.js'
  ];
  for (const p of candidates) {
    try {
      ProductModel = requireLocal(p);
      // If the module exports a default, use that
      if (ProductModel && ProductModel.default) ProductModel = ProductModel.default;
      console.log(`[productController] loaded model: ${p}`);
      return ProductModel;
    } catch (e) {
      // ignore and continue
    }
  }
  ProductModel = null;
  console.warn('[productController] no Product model found; using stub data');
  return null;
}

// Helper: parse pagination + fields
function parseQuery(req) {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '12', 10)));
  const fields = (req.query.fields || '').split(',').map(f => f.trim()).filter(Boolean).join(' ');
  return { page, limit, fields };
}

// Controller functions
module.exports = {
  async listProducts(req, res) {
    try {
      const Model = tryLoadModel();
      const { page, limit, fields } = parseQuery(req);

      if (!Model) {
        // fallback: return stubbed list so admin UI doesn't break
        const sample = [
          { _id: 'stub-1', title: 'sample product', price: 100, mrp: 150, slug: 'sample-product', thumbnail: null, images: [], description: 'stub' }
        ];
        return { ok: true, page, limit, total: 1, totalPages: 1, products: sample };
      }

      const skip = (page - 1) * limit;
      const query = {}; // add filters if desired
      const docs = await Model.find(query)
        .select(fields || '') // empty string selects all
        .skip(skip)
        .limit(limit)
        .lean()
        .exec();

      const total = await Model.countDocuments(query);
      return {
        ok: true,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        products: docs
      };
    } catch (err) {
      console.error('[productController] listProducts error:', err && (err.stack || err));
      throw err;
    }
  },

  async createProduct(req, res) {
    try {
      const Model = tryLoadModel();
      if (!Model) {
        return { ok: false, error: 'createProduct not available (no model)' };
      }
      const payload = req.body || {};
      const doc = await Model.create(payload);
      return { ok: true, product: doc };
    } catch (err) {
      console.error('[productController] createProduct error:', err && (err.stack || err));
      throw err;
    }
  },

  async getProduct(req, res) {
    try {
      const Model = tryLoadModel();
      if (!Model) return { ok: false, error: 'getProduct not available (no model)' };
      const id = req.params.id;
      const doc = await Model.findById(id).lean().exec();
      if (!doc) return { ok: false, error: 'not found' };
      return { ok: true, product: doc };
    } catch (err) {
      console.error('[productController] getProduct error:', err && (err.stack || err));
      throw err;
    }
  },

  async updateProduct(req, res) {
    try {
      const Model = tryLoadModel();
      if (!Model) return { ok: false, error: 'updateProduct not available (no model)' };
      const id = req.params.id;
      const payload = req.body || {};
      const doc = await Model.findByIdAndUpdate(id, payload, { new: true }).lean().exec();
      if (!doc) return { ok: false, error: 'not found' };
      return { ok: true, product: doc };
    } catch (err) {
      console.error('[productController] updateProduct error:', err && (err.stack || err));
      throw err;
    }
  },

  async deleteProduct(req, res) {
    try {
      const Model = tryLoadModel();
      if (!Model) return { ok: false, error: 'deleteProduct not available (no model)' };
      const id = req.params.id;
      await Model.findByIdAndDelete(id).exec();
      return { ok: true };
    } catch (err) {
      console.error('[productController] deleteProduct error:', err && (err.stack || err));
      throw err;
    }
  }
};
