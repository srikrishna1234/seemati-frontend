// backend/scripts/backfill-orders.js
const mongoose = require("mongoose");
require("dotenv").config();
const Order = require("../models/Order.cjs");
const User = require("../models/User.cjs");

async function main() {
  const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/test";
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  console.log("connected to mongo, starting backfill...");

  // find orders without userId but with a customer.phone
  const cursor = Order.find({ userId: { $exists: false }, "customer.phone": { $exists: true, $ne: "" } }).cursor();
  let updated = 0;
  for (let order = await cursor.next(); order != null; order = await cursor.next()) {
    const phone = (order.customer && order.customer.phone) || null;
    if (!phone) continue;
    const user = await User.findOne({ phone }).lean();
    if (user) {
      await Order.updateOne({ _id: order._id }, { $set: { userId: user._id } });
      updated++;
      console.log("Backfilled order", String(order._id), " -> user ", String(user._id), phone);
    } else {
      console.log("No user found for order", String(order._id), "phone", phone);
    }
  }

  console.log("Done. Orders updated:", updated);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
