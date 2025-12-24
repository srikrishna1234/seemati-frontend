// backend/src/routes/adminOrders.cjs
'use strict';

const express = require('express');
const router = express.Router();

const adminAuth = require('../middleware/adminAuth.cjs');
const Order = require('../../models/Order.cjs');


/**
 * GET /api/admin/orders
 * List all orders (latest first)
 * Optional query params:
 *   - from=YYYY-MM-DD
 *   - to=YYYY-MM-DD
 */
router.get('/orders', adminAuth, async (req, res) => {
  try {
    const { from, to } = req.query;

    const query = {};
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(500); // safety limit

    res.json({ ok: true, orders });
  } catch (err) {
    console.error('[adminOrders] list error', err);
    res.status(500).json({ ok: false, message: 'Failed to fetch orders' });
  }
});

/**
 * GET /api/admin/orders/:id
 * Get single order details
 */
router.get('/orders/:id', adminAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ ok: false, message: 'Order not found' });
    }
    res.json({ ok: true, order });
  } catch (err) {
    console.error('[adminOrders] detail error', err);
    res.status(500).json({ ok: false, message: 'Failed to fetch order' });
  }
});

/**
 * PUT /api/admin/orders/:id/status
 * Update order status
 */
router.put('/orders/:id/status', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = ['Placed', 'Packed', 'Shipped', 'Delivered'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        ok: false,
        message: 'Invalid status value',
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ ok: false, message: 'Order not found' });
    }

    res.json({ ok: true, order });
  } catch (err) {
    console.error('[adminOrders] status update error', err);
    res.status(500).json({ ok: false, message: 'Failed to update order status' });
  }
});

module.exports = router;
