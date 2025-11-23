// backend/src/routes/adminProduct.mjs
// ESM wrapper that safely loads the CommonJS controller via createRequire
import express from 'express';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Candidate CJS controller paths relative to this file
const candidates = [
  './controllers/productController.cjs',
  '../controllers/productController.cjs',
  '../../controllers/productController.cjs',
  '../../src/controllers/productController.cjs',
];

let controller = null;
for (const cand of candidates) {
  try {
    const resolved = require.resolve(path.join(__dirname, cand));
    const mod = require(resolved);
    controller = (mod && mod.default) ? mod.default : mod;
    console.log('[adminProduct.mjs] loaded CJS controller from', resolved);
    break;
  } catch (err) {
    // continue trying
  }
}

if (!controller) {
  console.warn('[adminProduct.mjs] CJS productController not found; admin routes return 501');
  controller = {
    listProducts: async (req, res) => res.status(501).json({ ok:false, error:'productController not loaded' }),
    createProduct: async (req, res) => res.status(501).json({ ok:false, error:'productController not loaded' }),
    getProduct: async (req, res) => res.status(501).json({ ok:false, error:'productController not loaded' }),
    updateProduct: async (req, res) => res.status(501).json({ ok:false, error:'productController not loaded' }),
    deleteProduct: async (req, res) => res.status(501).json({ ok:false, error:'productController not loaded' }),
  };
}

// Alias name mapping
const ctl = {
  listProducts: controller.listProducts || controller.getAllProducts,
  createProduct: controller.createProduct || controller.create,
  getProduct: controller.getProduct || controller.getProductById,
  updateProduct: controller.updateProduct || controller.update,
  deleteProduct: controller.deleteProduct || controller.delete,
};

const router = express.Router();

const invoke = (fn) => async (req, res) => {
  if (!fn) return res.status(501).json({ ok:false, error:'method not implemented' });
  try {
    const out = await fn(req, res);
    if (!res.headersSent && out !== undefined) res.json(out);
  } catch (err) {
    console.error('[adminProduct.mjs] controller error:', err);
    if (!res.headersSent) res.status(500).json({ ok:false, error:'server error' });
  }
};

router.get('/products', invoke(ctl.listProducts));
router.post('/products', invoke(ctl.createProduct));
router.get('/products/:id', invoke(ctl.getProduct));
router.put('/products/:id', invoke(ctl.updateProduct));
router.delete('/products/:id', invoke(ctl.deleteProduct));

export default router;
