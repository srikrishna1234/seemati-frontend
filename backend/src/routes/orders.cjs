// backend/src/routes/orders.cjs
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Order = require("../../models/Order.cjs");
const adminAuth = require("../middleware/adminAuth.cjs");

// Create order (POST /api/orders) â€” requires auth
router.post("/", adminAuth, async (req, res) => {
  try {
    const { customer, items, totals, paymentMethod } = req.body || {};
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No items" });
    }

    const subtotal = items.reduce((s, it) => s + (Number(it.price || 0) * (it.quantity || 1)), 0);
    const shipping = subtotal > 999 ? 0 : 60;
    const tax = Math.round(subtotal * 0.05);
    const total = subtotal + shipping + tax;

    const order = new Order({
      userId: req.user.id,
      customer,
      items,
      totals: { subtotal, shipping, tax, total },
      status: paymentMethod === "cod" ? "confirmed" : "pending",
      paymentMethod,
      createdAt: new Date(),
    });

    await order.save();
    return res.json({ ok: true, orderId: order._id, order });
  } catch (err) {
    console.error("[ERROR] order create failed:", err && err.stack ? err.stack : err);
    res.status(500).json({ message: "Server error" });
  }
});

// Fetch current user's orders (GET /api/orders/mine) â€” requires auth
// IMPORTANT: declare this before the param route "/:id" so "mine" doesn't get treated as an id.
router.get("/mine", adminAuth, async (req, res) => {
  try {
    console.log("[DEBUG] /api/orders/mine entered");
    console.log("[DEBUG] req.user:", req.user);

    const uid = req.user.id;
    console.log("[DEBUG] looking for orders by userId:", uid);

    const orders = await Order.find({ userId: uid })
      .sort({ createdAt: -1 })
      .lean()
      .limit(200);

    console.log("[DEBUG] found", orders.length, "orders");

    return res.json({ ok: true, count: orders.length, orders });
  } catch (err) {
    console.error("[ERROR] fetch my orders failed:", err && err.stack ? err.stack : err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Fetch a single order by id (GET /api/orders/:id) â€” requires auth and ownership/admin
router.get("/:id", adminAuth, async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: "Missing id parameter" });

  // validate ObjectId first to avoid CastError
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid order id" });
  }

  try {
    const order = await Order.findById(id).lean();
    if (!order) return res.status(404).json({ ok: false, message: "Order not found" });

    // allow if owner or admin
    if (String(order.userId) !== String(req.user.id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    return res.json({ ok: true, order });
  } catch (err) {
    console.error("[ERROR] fetch order failed:", err && err.stack ? err.stack : err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
