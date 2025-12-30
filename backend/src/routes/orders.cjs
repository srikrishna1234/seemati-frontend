const express = require("express");
const router = express.Router();
const Order = require("../../models/Order.cjs");

// CREATE ORDER
router.post("/", async (req, res) => {
  try {
    const { customer, items, paymentMethod } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ ok: false, message: "No items" });
    }

    const subtotal = items.reduce(
      (s, it) => s + Number(it.price || 0) * Number(it.quantity || 1),
      0
    );
    const shipping = subtotal > 999 ? 0 : 60;
    const tax = Math.round(subtotal * 0.05);
    const total = subtotal + shipping + tax;

    const order = new Order({
      userId: customer?.phone || "guest",
      customer,
      items,
      totals: { subtotal, shipping, tax, total },
      paymentMethod: paymentMethod || "cod",
      status: "confirmed",
    });

    await order.save();

    return res.json({ ok: true, orderId: order._id, order });
  } catch (err) {
    console.error("[ORDER CREATE ERROR]", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

module.exports = router;
