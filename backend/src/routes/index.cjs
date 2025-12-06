// backend/src/routes/index.cjs
const fs = require('fs');
const path = require('path');
const express = require('express');

const router = express.Router();
const routesDir = __dirname;

// Helper to try require a module by names list
function tryRequire(...names) {
  for (const name of names) {
    const p = path.join(routesDir, name);
    if (fs.existsSync(p)) {
      try {
        return require(p);
      } catch (err) {
        console.warn(`[ROUTES] require failed for ${p}:`, err && err.message ? err.message : err);
      }
    }
  }
  return null;
}

// Example: auth route may be named auth.cjs or authRoutes.cjs
const authModule = tryRequire('auth.cjs', 'authRoutes.cjs', 'auth.js', 'authRoutes.js');
if (authModule) {
  // authModule might be a router function or an object exporting a router
  if (typeof authModule === 'function') {
    router.use('/auth', authModule);
    console.log('[ROUTES] Mounted /auth from auth module');
  } else if (authModule.router && typeof authModule.router === 'function') {
    router.use('/auth', authModule.router);
    console.log('[ROUTES] Mounted /auth from authModule.router');
  } else {
    console.warn('[ROUTES] auth module found but did not export a router function');
  }
}

// Add other route files here similarly (products, admin, etc.)
const productsModule = tryRequire('products.cjs', 'productRoutes.cjs', 'products.js', 'productRoutes.js');
if (productsModule) {
  if (typeof productsModule === 'function') {
    router.use('/products', productsModule);
    console.log('[ROUTES] Mounted /products from products module');
  } else if (productsModule.router && typeof productsModule.router === 'function') {
    router.use('/products', productsModule.router);
    console.log('[ROUTES] Mounted /products from productsModule.router');
  }
}

// If you have more route files, add them the same way above.
// Generic fallback: try to require every file in routesDir and mount any router exports
fs.readdirSync(routesDir)
  .filter(f => f !== 'index.cjs' && /\.(cjs|js)$/.test(f))
  .forEach((file) => {
    // skip files we already attempted
    if (['auth.cjs','authRoutes.cjs','auth.js','authRoutes.js','products.cjs','productRoutes.cjs','products.js','productRoutes.js'].includes(file)) return;
    const modPath = path.join(routesDir, file);
    try {
      const mod = require(modPath);
      if (!mod) return;
      // derive a mount path from filename (e.g. orders.cjs -> /orders)
      const mount = `/${file.replace(/\.(cjs|js)$/, '')}`;
      if (typeof mod === 'function') {
        router.use(mount, mod);
        console.log(`[ROUTES] Mounted ${mount} from ${file}`);
      } else if (mod.router && typeof mod.router === 'function') {
        router.use(mount, mod.router);
        console.log(`[ROUTES] Mounted ${mount} from ${file}.router`);
      } else {
        // skip non-router exports
      }
    } catch (err) {
      // ignore require errors for optional files
    }
  });

module.exports = router;
