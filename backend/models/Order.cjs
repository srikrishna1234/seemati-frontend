const mongoose = require("mongoose");

const OrderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    title: String,
    sku: String,
    color: String,
    size: String,
    price: Number,
    quantity: Number,
    image: String,
  },
  { _id: true }
);

const OrderSchema = new mongoose.Schema(
  {
    userId: String,

    customer: {
      name: String,
      phone: String,
      address: String,
    },

    items: [OrderItemSchema],

    totals: {
      subtotal: Number,
      shipping: Number,
      tax: Number,
      total: Number,
    },

    status: {
      type: String,
      default: "confirmed",
    },

    paymentMethod: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);
