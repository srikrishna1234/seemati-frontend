// backend/src/routes/index.cjs
const fs = require('fs');
const path = require('path');
const express = require('express');

const router = express.Router();
const routesDir = __dirname;

function tryRequire(...names) {
  for (const name of names) {
    const p = path.join(routesDir, name);
    if (fs.existsSync(p)) {
      try { return require(p); }
      catch (err) { console.warn(`[ROUTES] Failed require ${p}:`, err.message); }
    }
  }
  return null;
}

// -------------------------
// AUTH ROUTES
// -------------------------
const authModule = tryRequire('auth.cjs','authRoutes.cjs','auth.js','authRoutes.js');
if (authModule) {
  router.use('/auth', authModule.router || authModule);
  console.log('[ROUTES] Mounted /auth');
}

// -------------------------
// PRODUCT ROUTES
// -------------------------
const productsModule = tryRequire('products.cjs','productRoutes.cjs','products.js','productRoutes.js');
if (productsModule) {
  router.use('/products', productsModule.router || productsModule);
  console.log('[ROUTES] Mounted /products');
}

// -------------------------
// EXPLICIT UPLOAD ROUTES (IMPORTANT)
// -------------------------
const uploadRoutes = tryRequire('uploadRoutes.cjs','uploadRoutes.js');
if (uploadRoutes) {
  router.use('/uploadRoutes', uploadRoutes);
  console.log('[ROUTES] Mounted /uploadRoutes (EXPLICIT)');
} else {
  console.warn('[ROUTES] uploadRoutes.cjs NOT FOUND');
}

// -------------------------
// UPLOAD COMPAT ROUTES
// -------------------------
// -------------------------
// FORCE-MOUNT uploadRoutes (Render fix)
// -------------------------
try {
  const uploadRoutes = require('./uploadRoutes.cjs');
  router.use('/uploadRoutes', uploadRoutes);
  console.log('[ROUTES] Mounted /uploadRoutes explicitly');
} catch (err) {
  console.warn('[ROUTES] uploadRoutes missing:', err.message);
}

/*
// -------------------------
// AUTO-MOUNT ALL OTHERS
// -------------------------
fs.readdirSync(routesDir)
  .filter(f => f !== 'index.cjs' && /\.(cjs|js)$/.test(f))
  .forEach((file) => {
    if (['auth.cjs','authRoutes.cjs','auth.js','authRoutes.js',
         'products.cjs','productRoutes.cjs','products.js','productRoutes.js',
         'uploadRoutes.cjs','uploadCompat.cjs'].includes(file)) return;

    try {
      const mod = require(path.join(routesDir, file));
      if (!mod) return;

      const mount = `/${file.replace(/\.(cjs|js)$/,'')}`;
      router.use(mount, mod.router || mod);
      console.log(`[ROUTES] Mounted ${mount} (auto)`);
    } catch {}
  });*/

module.exports = router;
