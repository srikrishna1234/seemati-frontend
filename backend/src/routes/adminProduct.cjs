// backend/src/routes/adminProduct.cjs
// Cross-environment router: safe under CommonJS and ESM.
// Avoids top-level require() so it won't throw when loaded in an ESM context.

'use strict';

async function buildRouter() {
  // load express safely (CJS require preferred, fallback to dynamic import)
  let express;
  if (typeof require !== 'undefined') {
    express = require('express');
  } else {
    const m = await import('express');
    express = m.default || m;
  }

  const router = express.Router();

  // robust controller loader: try require (via createRequire) then dynamic import
  async function tryLoadController(relPaths = []) {
    if (typeof require !== 'undefined') {
      try {
        const { createRequire } = require('module');
        const req = createRequire(__filename);
        for (const p of relPaths) {
          try {
            const resolved = req.resolve(p);
            let mod = req(resolved);
            if (mod && mod.default) mod = mod.default;
            console.log('[adminProduct] loaded controller (CJS):', p);
            return mod;
          } catch (e) {
            // ignore, continue
          }
        }
      } catch (e) {
        // ignore
      }
    }

    // fallback: dynamic import (ESM)
    if (typeof import !== 'undefined' && typeof URL !== 'undefined') {
      for (const p of relPaths) {
        try {
          const url = new URL(p, import.meta.url).href;
          const imported = await import(url);
          const mod = imported && imported.default ? imported.default : imported;
          console.log('[adminProduct] loaded controller (ESM):', p);
          return mod;
        } catch (e) {
          // ignore, continue
        }
      }
    }

    return null;
  }

  const controller = await tryLoadController([
    './controllers/productController.cjs',
    './controllers/productController.js',
    '../controllers/productController.cjs',
    '../controllers/productController.js',
    '../../controllers/productController.cjs',
    '../../controllers/productController.js'
  ]);

  if (!controller) {
    console.warn('[adminProduct] productController not found; routes will respond 501');
  }

  // helper to invoke controller methods safely
  const invoke = (fnName) => async (req, res) => {
    if (!controller || typeof controller[fnName] !== 'function') {
      return res.status(501).json({ ok: false, error: `productController.${fnName} not implemented` });
    }
    try {
      const out = await controller[fnName](req, res);
      if (!res.headersSent && out !== undefined) res.json(out);
    } catch (err) {
      console.error(`[adminProduct] controller ${fnName} error:`, err && (err.stack || err));
      if (!res.headersSent) res.status(500).json({ ok: false, error: 'server error' });
    }
  };

  // Define admin routes
  router.get('/products', invoke('listProducts'));
  router.post('/products', invoke('createProduct'));
  router.get('/products/:id', invoke('getProduct'));
  router.put('/products/:id', invoke('updateProduct'));
  router.delete('/products/:id', invoke('deleteProduct'));

  return router;
}

// Export for both CommonJS and ESM consumers without throwing at module-eval time.
if (typeof module !== 'undefined' && module.exports) {
  // For CommonJS consumers: build router and export a placeholder router immediately.
  // This prevents requiring code from breaking on startup if buildRouter is async.
  const express = (typeof require !== 'undefined') ? require('express') : null;
  const placeholder = express ? express.Router() : {
    stack: [],
    use() {},
  };

  // quick 503 placeholder handler for unknown endpoints until real router ready
  if (express) {
    placeholder.use((req, res) => res.status(503).send('admin routes initializing'));
  }

  module.exports = placeholder;

  // asynchronously build and attempt to hot-swap (best-effort)
  buildRouter().then((realRouter) => {
    try {
      // Replace placeholder's stack if express Router was used
      if (realRouter && placeholder && placeholder.stack && realRouter.stack) {
        placeholder.stack = realRouter.stack;
        // copy convenient properties
        ['params','regExp','mergeParams'].forEach(k => { if (realRouter[k] !== undefined) placeholder[k] = realRouter[k]; });
        console.log('[adminProduct] router hot-swapped successfully');
      }
    } catch (e) {
      console.error('[adminProduct] failed to hot-swap router:', e && (e.stack || e));
    }
  }).catch(e => {
    console.error('[adminProduct] failed to build router:', e && (e.stack || e));
  });

} else {
  // ESM environment — export the actual router (top-level await supported)
  export default await buildRouter();
}
