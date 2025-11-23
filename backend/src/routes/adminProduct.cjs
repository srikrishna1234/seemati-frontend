// backend/src/routes/adminProduct.cjs
'use strict';

/*
  CommonJS-only adminProduct router.
  - Does NOT use ESM `import`/`export`.
  - Synchronously attempts to require the controller from several likely paths.
  - Provides compatibility aliasing for common controller method names.
  - Exports an Express router via module.exports.
*/

const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');
const req = createRequire(__filename);

function tryRequirePaths(pathsToTry) {
  for (const p of pathsToTry) {
    try {
      const resolved = req.resolve(p);
      const mod = req(resolved);
      if (mod) {
        return (mod && mod.__esModule && mod.default) ? mod.default : mod;
      }
    } catch (e) {
      // continue trying
    }
  }
  return null;
}

function makeControllerWrapper(controller) {
  // Map common expected names to actual implemented names.
  // This allows older route names (listProducts/getProduct) to work with
  // controllers exporting getAllProducts/getProductById etc.
  return {
    listProducts: controller.listProducts || controller.getAllProducts || controller.getProducts || controller.index,
    createProduct: controller.createProduct || controller.create || controller.addProduct,
    getProduct: controller.getProduct || controller.getProductById || controller.findById,
    updateProduct: controller.updateProduct || controller.editProduct || controller.update,
    deleteProduct: controller.deleteProduct || controller.removeProduct || controller.delete,
  };
}

const possibleControllerPaths = [
  // relative to this file
  './controllers/productController.cjs',
  './controllers/productController.js',
  '../controllers/productController.cjs',
  '../controllers/productController.js',
  '../../controllers/productController.cjs',
  '../../controllers/productController.js',
  // older potential locations
  '../../models/productController.cjs',
  '../../controllers/productController/index.cjs'
];

let controller = tryRequirePaths(possibleControllerPaths);

if (!controller) {
  console.warn('[adminProduct] productController not found at expected paths:', possibleControllerPaths);
  // create a stub controller that returns helpful 501 responses
  controller = {
    listProducts: async (req, res) => res.status(501).json({ ok: false, error: 'productController not loaded on server' }),
    createProduct: async (req, res) => res.status(501).json({ ok: false, error: 'productController not loaded on server' }),
    getProduct: async (req, res) => res.status(501).json({ ok: false, error: 'productController not loaded on server' }),
    updateProduct: async (req, res) => res.status(501).json({ ok: false, error: 'productController not loaded on server' }),
    deleteProduct: async (req, res) => res.status(501).json({ ok: false, error: 'productController not loaded on server' }),
  };
} else {
  console.log('[adminProduct] productController loaded from file.');
}

// Wrap/alias controller methods for compatibility
const ctl = makeControllerWrapper(controller);

// Create express router
let express;
try {
  express = require('express');
} catch (e) {
  console.error('[adminProduct] express is not available to build router:', e && e.message);
  // export a lightweight placeholder router-like object to avoid crash on require()
  const placeholder = {
    stack: [],
    use() {},
  };
  module.exports = placeholder;
  return;
}

const router = express.Router();

// helper to call a controller function if exists, otherwise return 501
const invoke = (fn) => async (req, res) => {
  try {
    if (!fn || typeof fn !== 'function') {
      return res.status(501).json({ ok: false, error: 'productController method not implemented' });
    }
    // Call controller method. If it handles res itself, that's OK.
    const result = await fn(req, res);
    // If controller returned a value and didn't send response, send it as JSON.
    if (!res.headersSent && result !== undefined) {
      return res.json(result);
    }
    // otherwise assume controller sent the response
  } catch (err) {
    console.error('[adminProduct] controller invocation error:', err && (err.stack || err));
    if (!res.headersSent) res.status(500).json({ ok: false, error: 'server error' });
  }
};

router.get('/products', invoke(ctl.listProducts));
router.post('/products', invoke(ctl.createProduct));
router.get('/products/:id', invoke(ctl.getProduct));
router.put('/products/:id', invoke(ctl.updateProduct));
router.delete('/products/:id', invoke(ctl.deleteProduct));

module.exports = router;
