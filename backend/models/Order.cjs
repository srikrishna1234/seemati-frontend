// backend/models/Order.cjs
const mongoose = require("mongoose");
const { Schema } = mongoose;

const OrderItemSchema = new Schema({
  productId: String,
  title: String,
  price: Number,
  quantity: Number,
  image: String,
}, { _id: true });

const TotalsSchema = new Schema({
  subtotal: Number,
  shipping: Number,
  tax: Number,
  total: Number,
}, { _id: false });

const OrderSchema = new Schema({
  userId: {
    type: String,          // ✅ FIXED: phone number from OTP
    index: true,
    required: true
  },
  customer: {
    name: String,
    phone: String,
    address: String,
    city: String,
    pincode: String,
    state: String,
  },
  items: [OrderItemSchema],
  totals: TotalsSchema,
  status: { type: String, default: "pending" },
  paymentMethod: String,
  createdAt: { type: Date, default: Date.now },
  meta: { type: Schema.Types.Mixed, default: {} },
});

module.exports = mongoose.model("Order", OrderSchema);
