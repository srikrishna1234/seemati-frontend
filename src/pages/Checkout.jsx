// src/pages/Checkout.jsx
import React from "react";
import { useCartState, useCartDispatch } from "../context/CartContext";
import { useNavigate } from "react-router-dom";
import CheckoutWithOtp from "../components/OtpCheckout"; // path to the file you created

export default function Checkout() {
  const { items } = useCartState();
  const dispatch = useCartDispatch();
  const navigate = useNavigate();

  if (!items || items.length === 0) {
    return <div style={{ padding: 20 }}>Cart empty</div>;
  }

  // normalize items for the CheckoutWithOtp (it expects productId, title, price, quantity)
  const initialCart = items.map((it) => ({
    productId: it.productId || it.id || it._id || "",
    title: it.title || it.name || "Item",
    price: Number(it.price || it.amount || 0) || 0,
    quantity: Number(it.quantity || 1) || 1,
    image: it.image || it.img || null,
  }));

  // called when CheckoutWithOtp has successfully placed an order
  function handleOrderPlaced(orderId, order) {
    try {
      dispatch({ type: "CLEAR_CART" }); // clear local cart state
    } catch (e) {
      // ignore if dispatch fails
    }

    // navigate using react-router (no full page reload)
    if (orderId) {
      navigate(`/order-success/${orderId}`);
    } else if (order && order._id) {
      navigate(`/order-success/${order._id}`);
    } else {
      navigate("/");
    }
  }

  return <CheckoutWithOtp initialCart={initialCart} onOrderPlaced={handleOrderPlaced} />;
}
