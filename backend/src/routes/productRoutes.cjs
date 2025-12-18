const express = require("express");
const router = express.Router();
// TEMP HEALTH CHECK — REMOVE AFTER TEST
router.get("/__health", (req, res) => {
  res.json({
    ok: true,
    route: "productRoutes",
    time: new Date().toISOString()
  });
});

const Product = require("../../models/Product.cjs");
const slugify = require("../utils/slugify.js");
const generateUniqueSlug = require("../utils/generateUniqueSlug.js");

/* ================= CREATE ================= */
router.post("/", async (req, res) => {
  try {
    const { title, slug: incomingSlug, ...rest } = req.body;
    const baseSlug = slugify(incomingSlug || title || "product");
    const slug = await generateUniqueSlug(Product, baseSlug);

    const product = new Product({ ...rest, title, slug });
    await product.save();

    res.status(201).json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= LIST ================= */
router.get("/", async (req, res) => {
  const products = await Product.find().lean();
  res.json({ success: true, products });
});

/* ================= GET BY ID (ADMIN) ================= */
router.get("/id/:id", async (req, res) => {
  const product = await Product.findById(req.params.id).lean();
  if (!product) return res.status(404).json({ success: false });
  res.json({ success: true, product });
});

/* ================= GET BY SLUG (PUBLIC) ================= */
router.get("/slug/:slug", async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug }).lean();
  if (!product) return res.status(404).json({ success: false });
  res.json({ success: true, product });
});

/* ================= UPDATE ================= */
router.put("/:id", async (req, res) => {
console.log("🔥 ROUTES PUT HIT", req.params.id);

  const updated = await Product.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },   // 🔥 THIS IS THE FIX
    { new: true, runValidators: true }
  ).lean();

  if (!updated) return res.status(404).json({ success: false });
  res.json({ success: true, product: updated });
});


/* ================= DELETE ================= */
router.delete("/:id", async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

module.exports = router;
