// backend/src/routes/cartRoutes.js
const express = require("express");
const router = express.Router();

let serverCart = {}; // in-memory demo cart

console.log("[cartRoutes] router file loaded");

router.get("/cart", (req, res) => {
  return res.json({ ok: true, cart: serverCart });
});

router.post("/cart", (req, res) => {
  const { cart } = req.body;
  if (!cart || typeof cart !== "object") {
    return res.status(400).json({ ok: false, error: "Invalid cart" });
  }
  serverCart = cart;
  return res.json({ ok: true, cart: serverCart });
});

module.exports = router;
