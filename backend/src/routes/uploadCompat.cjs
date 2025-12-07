// backend/src/routes/uploadCompat.cjs
'use strict';

/**
 * uploadCompat.cjs
 *
 * Small compatibility router that mounts your existing upload routers
 * at the paths the frontend expects (e.g. /products/:id/upload, /products/upload).
 *
 * Drop this file in backend/src/routes and then add one line to src/routes/index.cjs:
 *   router.use('/', require('./uploadCompat.cjs'));
 *
 * Restart the backend after that.
 */

const express = require('express');
const path = require('path');

function tryRequireCandidate(name) {
  const candidates = [
    name,
    path.join(__dirname, name),
    path.join(__dirname, '..', name),
    path.join(__dirname, name.replace(/\.cjs$/, '.js')),
    path.join(__dirname, '..', name.replace(/\.cjs$/, '.js'))
  ];
  for (const c of candidates) {
    try {
      /* eslint-disable global-require, import/no-dynamic-require */
      // require may throw if file doesn't exist; catch and continue
      // note: using require with an absolute/relative path from __dirname above
      // so we find uploadRoutes.cjs / upload.cjs / adminUpload.cjs if present
      // in your src/routes folder.
      // Use require.resolve to ensure errors are visible when appropriate.
      // We intentionally catch errors here to allow missing optional modules.
      // The found module should be an express.Router().
      // eslint-enable global-require, import/no-dynamic-require
      // Protect from exceptions while requiring
      // Use require only when file exists — require will throw if file missing but we catch below.
      const mod = require(c);
      if (mod) return mod;
    } catch (e) {
      // ignore, try next candidate
    }
  }
  return null;
}

const router = express.Router();

// Try to load the upload routers that exist in your repo.
// The filenames we saw in your project earlier: uploadRoutes.cjs, upload.cjs, adminUpload.cjs
const uploadRoutes = tryRequireCandidate('uploadRoutes.cjs') || tryRequireCandidate('uploadRoutes.js');
const uploadRoot   = tryRequireCandidate('upload.cjs') || tryRequireCandidate('upload.js');
const adminUpload  = tryRequireCandidate('adminUpload.cjs') || tryRequireCandidate('adminUpload.js');

// Mount them in a compatibility-friendly way:
//
// - If uploadRoutes exports a router with route PUT('/:id/upload'), mounting it at '/products'
//   will expose PUT /products/:id/upload which matches frontend expectations.
// - If upload.cjs defines router.post('/products/upload'), mounting it at '/' will keep that path.
// - If adminUpload exists, we also mount it at /adminUpload to support attempted requests.
if (uploadRoutes) {
  // mount the existing uploadRoutes under /products so its PUT('/:id/upload') becomes /products/:id/upload
  router.use('/products', uploadRoutes);
}

if (uploadRoot) {
  // mount upload.cjs at root so its internal '/products/upload' remains '/products/upload'
  router.use('/', uploadRoot);
}

if (adminUpload) {
  // mount adminUpload at /adminUpload so frontend attempts like /api/adminUpload/:id will resolve
  router.use('/adminUpload', adminUpload);
}

// Additionally: provide a very small fallback endpoints to reduce 404s.
// These will accept uploads and return 501 if underlying upload handler is absent.
const multer = (() => {
  try {
    return require('multer');
  } catch (e) {
    return null;
  }
})();

if (!uploadRoutes && !uploadRoot && !adminUpload) {
  // No real upload handlers found — add minimal endpoints that respond with 501 and helpful message.
  router.post('/products/upload', (req, res) => {
    res.status(501).json({ success: false, message: 'Upload handlers not found on server (compat wrapper).' });
  });
  router.put('/products/:id/upload', (req, res) => {
    res.status(501).json({ success: false, message: 'Upload handlers not found on server (compat wrapper).' });
  });
  router.post('/adminUpload/:id', (req, res) => {
    res.status(501).json({ success: false, message: 'Upload handlers not found on server (compat wrapper).' });
  });
} else {
  // If some handlers were present we are done — previously mounted routers will respond.
  // But also provide a tiny POST /products/upload handler using multer if multer present
  // and none of the mounted routers provided POST /products/upload specifically.
  if (multer && !uploadRoot) {
    const upload = multer().any();
    router.post('/products/upload', upload, (req, res) => {
      // no backend processing implemented here — return 501 to indicate missing connector
      res.status(501).json({ success: false, message: 'Upload route present (light fallback) but no connector to S3 configured.' });
    });
  }
}

module.exports = router;
