// src/pages/Checkout.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CheckoutWithOtp from "../components/OtpCheckout";
import FreeShippingBar from "../components/FreeShippingBar";
import {
  loadCart,
  computeTotals,
  saveCart,
  SHIPPING_THRESHOLD,
} from "../utils/cartHelpers";

export default function Checkout() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [totals, setTotals] = useState({
    subtotal: 0,
    shipping: 0,
    total: 0,
  });

  /* ================= LOAD CART ================= */
  useEffect(() => {
    const load = () => {
      const raw = loadCart();
      const items = Array.isArray(raw) ? raw : raw.items || [];

      setCartItems(
        items.map((it) => ({
          productId: it.productId || it.id || it._id || "",
          title: it.title || it.name || "Item",
          price: Number(it.price || 0),
          quantity: Number(it.quantity || 1),
          image: it.image || null,
        }))
      );

      try {
        setTotals(computeTotals(Array.isArray(raw) ? { items: raw } : raw));
      } catch {
        const subtotal = items.reduce(
          (s, it) => s + it.price * it.quantity,
          0
        );
        setTotals({ subtotal, shipping: 0, total: subtotal });
      }
    };

    load();
    window.addEventListener("cart-updated", load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener("cart-updated", load);
      window.removeEventListener("storage", load);
    };
  }, []);

  /* ================= EMPTY CART ================= */
  if (!cartItems.length) {
    return (
      <>
       
       <div
  style={{
    maxWidth: 600,
    margin: "60px auto",
    padding: 32,
    textAlign: "center",
    background: "#fff",
    borderRadius: 12,
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
  }}
>

          <h2>Your cart is empty</h2>
          <p>Please add items before checkout.</p>
          <button
            onClick={() => navigate("/shop")}
            style={{
              marginTop: 20,
              padding: "12px 20px",
              background: "#0b5cff",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Go to Shop
          </button>
        </div>
      </>
    );
  }

  /* ================= ORDER SUCCESS ================= */
  function handleOrderPlaced(orderId, order) {
  try {
    // Clear cart in localStorage
    saveCart({ items: [] });

    // Notify app that cart changed
    window.dispatchEvent(new Event("cart-updated"));
  } catch (e) {
    console.error("Failed to clear cart after order", e);
  }

  // SAFE redirect (route exists)
  navigate("/");
}


  /* ================= STYLES ================= */
  const pageStyle = {
    padding: 24,
    background: "#f9fafb",
    minHeight: "100vh",
  };

  const layoutStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 360px",
    gap: 24,
    alignItems: "start",
  };

  const cardStyle = {
  background: "#fbd5df",
  borderRadius: 12,
  padding: 24,
  boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
};
   

  /* ================= MAIN ================= */
  return (
    <>
      {/* FREE SHIPPING — ALWAYS TOP */}
      <div style={{ position: "sticky", top: 0, zIndex: 50 }}>
        <FreeShippingBar />
      </div>

      <div style={pageStyle}>
	 

        <h1 style={{ marginBottom: 6 }}>Secure Checkout</h1>
        <p style={{ color: "#6b7280", marginBottom: 28 }}> 
          Complete your order safely with OTP verification
        </p>

        <div style={{ ...layoutStyle, marginTop: -10 }}>
          {/* LEFT */}
          <div style={cardStyle}>
		  
            <CheckoutWithOtp
              initialCart={cartItems}
              onOrderPlaced={handleOrderPlaced}
              orderSummary={totals}
            />
          </div>

          {/* RIGHT */}
          <aside style={{ alignSelf: "flex-start" }}>
            <div
  style={{
    ...cardStyle,
    background: "#fbd5df",
  }}
>
              <h3>Order summary</h3>

             <ul style={{ listStyle: "none", padding: 0, margin: "16px 0" }}>
  {cartItems.map((it, i) => (
    <li
      key={i}
      style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
        marginBottom: 14,
      }}
    >
      {/* PRODUCT THUMBNAIL */}
      <div
        style={{
          width: 56,
          height: 72,
          borderRadius: 8,
          overflow: "hidden",
          background: "#f3f4f6",
          flexShrink: 0,
        }}
      >
        {it.image ? (
          <img
            src={it.image}
            alt={it.title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : null}
      </div>

      {/* PRODUCT INFO */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>
          {it.title}
        </div>
        <div style={{ fontSize: 13, color: "#6b7280" }}>
          Qty: {it.quantity}
        </div>
      </div>

      {/* PRICE */}
      <div style={{ fontWeight: 600 }}>
        ₹{(it.price * it.quantity).toFixed(2)}
      </div>
    </li>
  ))}
</ul>

              <hr />

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Subtotal</span>
                <strong>₹{totals.subtotal.toFixed(2)}</strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Shipping</span>
                <strong style={{ color: "#059669" }}>FREE</strong>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 12,
                  fontSize: 18,
                }}
              >
                <strong>Total</strong>
                <strong style={{ color: "#0b5cff" }}>
                  ₹{totals.total.toFixed(2)}
                </strong>
              </div>

              <p style={{ marginTop: 10, color: "#374151" }}>
                Free shipping on orders above ₹
                {SHIPPING_THRESHOLD}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
