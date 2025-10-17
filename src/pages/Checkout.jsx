// src/pages/Checkout.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CheckoutWithOtp from "../components/OtpCheckout"; // keep your existing path
import FreeShippingBar from "../components/FreeShippingBar";
import { loadCart, computeTotals, saveCart, SHIPPING_THRESHOLD } from "../utils/cartHelpers";

export default function Checkout() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [totals, setTotals] = useState({ subtotal: 0, shipping: 0, total: 0 });

  useEffect(() => {
    const raw = loadCart();
    const items = Array.isArray(raw) ? raw : raw.items ?? [];
    setCartItems(
      items.map((it) => ({
        productId: it.productId || it.id || it._id || it.slug || "",
        title: it.title || it.name || "Item",
        price: Number(it.price || it.amount || 0) || 0,
        quantity: Number(it.quantity || it.qty || 1) || 1,
        image: it.image || it.img || null,
      }))
    );

    try {
      const computed = computeTotals(Array.isArray(raw) ? { items: raw } : raw);
      setTotals(computed);
    } catch (e) {
      const subtotal = items.reduce((s, it) => s + (Number(it.price || 0) * Number(it.quantity || it.qty || 1)), 0);
      setTotals({ subtotal, shipping: 0, total: subtotal });
    }

    function onCartUpdated() {
      const r = loadCart();
      const its = Array.isArray(r) ? r : r.items ?? [];
      setCartItems(
        its.map((it) => ({
          productId: it.productId || it.id || it._id || it.slug || "",
          title: it.title || it.name || "Item",
          price: Number(it.price || it.amount || 0) || 0,
          quantity: Number(it.quantity || it.qty || 1) || 1,
          image: it.image || it.img || null,
        }))
      );
      try {
        const computed = computeTotals(Array.isArray(r) ? { items: r } : r);
        setTotals(computed);
      } catch (e2) {
        const subtotal = its.reduce((s, it) => s + (Number(it.price || 0) * Number(it.quantity || it.qty || 1)), 0);
        setTotals({ subtotal, shipping: 0, total: subtotal });
      }
    }

    window.addEventListener("cart-updated", onCartUpdated);
    window.addEventListener("storage", onCartUpdated);
    return () => {
      window.removeEventListener("cart-updated", onCartUpdated);
      window.removeEventListener("storage", onCartUpdated);
    };
  }, []);

  if (!cartItems || cartItems.length === 0) {
    return (
      <>
        <FreeShippingBar />
        <div style={{ padding: 20 }}>Cart empty</div>
      </>
    );
  }

  function handleOrderPlaced(orderId, order) {
    try {
      saveCart({ items: [] });
    } catch (e) {
      try {
        localStorage.setItem("seemati_cart_v1", JSON.stringify({ items: [] }));
        window.dispatchEvent(new Event("cart-updated"));
      } catch {}
    }

    if (orderId) {
      navigate(`/order-success/${orderId}`);
    } else if (order && order._id) {
      navigate(`/order-success/${order._id}`);
    } else {
      navigate("/");
    }
  }

  // inline styles
  const pageStyle = { padding: 20 };
  const layoutStyle = { display: "flex", gap: 24 };
  const asideStyle = { width: 360 };
  const cardStyle = { border: "1px solid #eee", borderRadius: 8, padding: 16, background: "#fff" };

  return (
    <>
      <FreeShippingBar />
      <div style={pageStyle}>
        <h1 style={{ marginTop: 0 }}>Checkout</h1>

        <div style={layoutStyle}>
          <div style={{ flex: 1 }}>
            <CheckoutWithOtp
              initialCart={cartItems.map((it) => ({
                productId: it.productId,
                title: it.title,
                price: it.price,
                quantity: it.quantity,
                image: it.image,
              }))}
              onOrderPlaced={handleOrderPlaced}
              orderSummary={totals}
            />
          </div>

          <aside style={asideStyle}>
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0 }}>Order summary</h3>

              <ul style={{ paddingLeft: 16 }}>
                {cartItems.map((it, idx) => (
                  <li key={idx} style={{ marginBottom: 8 }}>
                    {it.title} × {it.quantity} — ₹{(it.price * it.quantity).toFixed(2)}
                  </li>
                ))}
              </ul>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                <div style={{ color: "#374151" }}>Subtotal</div>
                <div style={{ fontWeight: 800 }}>₹{Number(totals.subtotal).toFixed(2)}</div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                <div style={{ color: "#374151" }}>Shipping</div>
                <div style={{ fontWeight: 700 }}>
                  {Number(totals.shipping) === 0 ? (
                    <span style={{ color: "#059669", fontWeight: 800 }}>FREE</span>
                  ) : (
                    `₹${Number(totals.shipping).toFixed(2)}`
                  )}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                <div style={{ color: "#111", fontWeight: 800 }}>Grand total</div>
                <div style={{ fontWeight: 900, fontSize: 18 }}>₹{Number(totals.total).toFixed(2)}</div>
              </div>

              <div style={{ marginTop: 10, color: "#374151" }}>
                Order for ₹{Number(SHIPPING_THRESHOLD).toFixed(0)} and above to get{" "}
                <strong style={{ color: "#059669" }}>free shipping</strong>.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
