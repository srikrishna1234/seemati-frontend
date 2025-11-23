// backend/src/routes/adminProduct.cjs
// A robust CommonJS Express router for admin-product endpoints.
// It tries to load a productController using require() first, falling back to dynamic import() for ESM controllers.
// If no controller is found, routes return helpful 501 responses so server startup doesn't give "require is not defined".

'use strict';

const express = require('express');
const path = require('path');
const { createRequire } = require('module');
const { pathToFileURL } = require('url');
const requireLocal = createRequire(__filename);

const router = express.Router();

// Helper: robust loader to support CommonJS and ESM controller files
async function tryLoadController(relPath) {
  try {
    // resolve relative to this file
    let resolved;
    try {
      resolved = requireLocal.resolve(relPath);
    } catch (resolveErr) {
      return null;
    }

    // try CommonJS require
    try {
      return requireLocal(resolved);
    } catch (reqErr) {
      // fallthrough to import
    }

    // dynamic import for ESM
    try {
      const fileUrl = pathToFileURL(resolved).href;
      const imported = await import(fileUrl);
      return imported && imported.default ? imported.default : imported;
    } catch (impErr) {
      return null;
    }
  } catch (err) {
    return null;
  }
}

// Attempt to load a controller from a few common paths
async function loadProductController() {
  const candidates = [
    './controllers/productController.cjs',
    './controllers/productController.js',
    '../controllers/productController.cjs',
    '../controllers/productController.js',
    '../../controllers/productController.cjs',
    '../../controllers/productController.js'
  ];

  for (const c of candidates) {
    const mod = await tryLoadController(c);
    if (mod) {
      console.log(`[adminProduct] loaded controller: ${c}`);
      return mod;
    }
  }
  console.warn('[adminProduct] productController not found in expected paths');
  return null;
}

// Mount routes async so we can await controller load
(async () => {
  const controller = await loadProductController();

  // GET /admin-api/products => list (or 501 if controller missing)
  router.get('/products', async (req, res) => {
    try {
      if (!controller || typeof controller.listProducts !== 'function') {
        return res.status(501).json({ ok: false, error: 'productController.listProducts not implemented' });
      }
      const out = await controller.listProducts(req, res);
      // controller may already handle response; if it returns data, send it
      if (out !== undefined && !res.headersSent) res.json(out);
    } catch (err) {
      console.error('[adminProduct] GET /products error:', err && (err.stack || err));
      if (!res.headersSent) res.status(500).json({ ok: false, error: 'server error' });
    }
  });

  // POST /admin-api/products => create product
  router.post('/products', async (req, res) => {
    try {
      if (!controller || typeof controller.createProduct !== 'function') {
        return res.status(501).json({ ok: false, error: 'productController.createProduct not implemented' });
      }
      const out = await controller.createProduct(req, res);
      if (out !== undefined && !res.headersSent) res.json(out);
    } catch (err) {
      console.error('[adminProduct] POST /products error:', err && (err.stack || err));
      if (!res.headersSent) res.status(500).json({ ok: false, error: 'server error' });
    }
  });

  // GET /admin-api/products/:id => get product
  router.get('/products/:id', async (req, res) => {
    try {
      if (!controller || typeof controller.getProduct !== 'function') {
        return res.status(501).json({ ok: false, error: 'productController.getProduct not implemented' });
      }
      const out = await controller.getProduct(req, res);
      if (out !== undefined && !res.headersSent) res.json(out);
    } catch (err) {
      console.error('[adminProduct] GET /products/:id error:', err && (err.stack || err));
      if (!res.headersSent) res.status(500).json({ ok: false, error: 'server error' });
    }
  });

  // PUT /admin-api/products/:id => update product
  router.put('/products/:id', async (req, res) => {
    try {
      if (!controller || typeof controller.updateProduct !== 'function') {
        return res.status(501).json({ ok: false, error: 'productController.updateProduct not implemented' });
      }
      const out = await controller.updateProduct(req, res);
      if (out !== undefined && !res.headersSent) res.json(out);
    } catch (err) {
      console.error('[adminProduct] PUT /products/:id error:', err && (err.stack || err));
      if (!res.headersSent) res.status(500).json({ ok: false, error: 'server error' });
    }
  });

  // DELETE /admin-api/products/:id => delete product
  router.delete('/products/:id', async (req, res) => {
    try {
      if (!controller || typeof controller.deleteProduct !== 'function') {
        return res.status(501).json({ ok: false, error: 'productController.deleteProduct not implemented' });
      }
      const out = await controller.deleteProduct(req, res);
      if (out !== undefined && !res.headersSent) res.json(out);
    } catch (err) {
      console.error('[adminProduct] DELETE /products/:id error:', err && (err.stack || err));
      if (!res.headersSent) res.status(500).json({ ok: false, error: 'server error' });
    }
  });

  // Add other admin endpoints here following the same pattern...

})().catch(e => {
  console.error('[adminProduct] bootstrap error:', e && (e.stack || e));
});

module.exports = router;
