// backend/src/routes/cart.js
const express = require('express');
const router = express.Router();

// simple in-memory storage for now
let savedCart = { items: [] };

// GET /api/cart  -> returns the saved cart
router.get('/', (req, res) => {
  res.json(savedCart);
});

// POST /api/cart -> save the cart body
router.post('/', (req, res) => {
  if (!req.body) return res.status(400).json({ error: 'Missing body' });
  savedCart = req.body;
  res.json({ ok: true, savedCart });
});

module.exports = router;
