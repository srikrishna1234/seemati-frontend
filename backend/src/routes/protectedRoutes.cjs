// backend/src/routes/protectedRoutes.cjs
const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth.cjs'); // use .cjs here

// Simple protected test endpoint
router.get('/test', adminAuth, async (req, res) => {
  return res.json({
    success: true,
    message: 'Protected route accessed',
    user: req.user || null,
  });
});

module.exports = router;
