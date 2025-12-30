const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    userId: { type: String, index: true },

    customer: {
      name: { type: String },
      phone: { type: String },
      address: { type: String },
    },

    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },

        title: { type: String, required: true },

        // 🔥 THESE 3 FIELDS WERE MISSING BEFORE
        sku: { type: String, default: "" },
        color: { type: String, default: "" },
        size: { type: String, default: "" },

        price: { type: Number, required: true },
        quantity: { type: Number, required: true },

        image: { type: String, default: "" },
      },
    ],

    totals: {
      subtotal: { type: Number },
      shipping: { type: Number },
      tax: { type: Number },
      total: { type: Number },
    },

    status: { type: String, default: "pending" },
    paymentMethod: { type: String, default: "cod" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);
