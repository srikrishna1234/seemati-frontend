
// backend/src/routes/adminProduct.cjs
'use strict';

const express = require('express');
const path = require('path');
const { createRequire } = require('module');

const req = createRequire(__filename);
const router = express.Router();

/* ---------- LOAD CONTROLLER (ONCE) ---------- */

let controller;
try {
  controller = req('../../src/controllers/productController.cjs');
  console.log('[adminProduct] productController loaded');
} catch (err) {
  console.error('[adminProduct] FAILED to load productController:', err);
  controller = {};
}

/* ---------- ROUTES (NO WRAPPERS, NO DOUBLE RESPONSES) ---------- */

// All routes are RELATIVE to mount path
router.get('/', controller.getAllProducts);
router.post('/', controller.createProduct);
router.get('/:id', controller.getProductById);
router.put('/:id', controller.updateProduct);
router.delete('/:id', controller.deleteProduct);

module.exports = router;
