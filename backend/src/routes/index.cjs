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

// -------------------------
// AUTH ROUTES
// -------------------------
const authModule = tryRequire('auth.cjs', 'authRoutes.cjs', 'auth.js', 'authRoutes.js');
if (authModule) {
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

// -------------------------
// PRODUCTS ROUTES
// -------------------------
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

// -------------------------
// ADD COMPAT UPLOAD ROUTES (IMPORTANT)
// -------------------------
// This ensures these legacy upload paths work:
//   /api/products/upload
//   /api/products/:id/upload
//   /api/adminUpload/:id
//
// Your uploadCompat.cjs MUST exist in same folder.
//
try {
  const uploadCompat = require('./uploadCompat.cjs');
  router.use('/', uploadCompat);
  console.log('[ROUTES] Mounted uploadCompat at /');
} catch (err) {
  console.warn('[ROUTES] uploadCompat.cjs missing or failed to load:', err && err.message);
}

// -------------------------
// AUTO-MOUNT ANY OTHER ROUTE FILES
// -------------------------
fs.readdirSync(routesDir)
  .filter(f => f !== 'index.cjs' && /\.(cjs|js)$/.test(f))
  .forEach((file) => {
    if ([
      'auth.cjs','authRoutes.cjs','auth.js','authRoutes.js',
      'products.cjs','productRoutes.cjs','products.js','productRoutes.js',
      'uploadCompat.cjs'
    ].includes(file)) return;

    const modPath = path.join(routesDir, file);
    try {
      const mod = require(modPath);
      if (!mod) return;

      const mount = `/${file.replace(/\.(cjs|js)$/, '')}`;
      if (typeof mod === 'function') {
        router.use(mount, mod);
        console.log(`[ROUTES] Mounted ${mount} from ${file}`);
      } else if (mod.router && typeof mod.router === 'function') {
        router.use(mount, mod.router);
        console.log(`[ROUTES] Mounted ${mount} from ${file}.router`);
      }
    } catch (err) {
      // ignore optional module errors
    }
  });

module.exports = router;
