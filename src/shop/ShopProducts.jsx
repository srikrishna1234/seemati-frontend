// src/shop/ShopProducts.jsx
import React, { useEffect } from "react";
import ShopProductCard from "./shopProductCard";
import { useSelector } from "react-redux";

/**
 * ShopProducts.jsx (replacement)
 * - Renders a responsive grid of ShopProductCard.
 * - Adds a fixed bottom free-shipping banner which:
 *    - shows "Congrats — you are eligible..." if cart subtotal >= threshold
 *    - otherwise shows "Free shipping above ₹999. Subtotal ₹X. Add ₹Y more..."
 *
 * - Reads cart from redux store defensively (works if your cart slice stores subtotal/total or items).
 */

const FREE_SHIPPING_THRESHOLD = 999;

export default function ShopProducts({ products = [] }) {
  // defensive selection of cart from redux
  const cartState = useSelector((s) => s.cart ?? s.cartSlice ?? s.cartReducer ?? {});
  // compute subtotal: check common fields or compute from items
  const subtotalFromSlice = cartState.subtotal ?? cartState.total ?? cartState.cartTotal ?? null;

  const computedSubtotal = (() => {
    if (typeof subtotalFromSlice === "number") return subtotalFromSlice;
    // try items array
    const items = cartState.items ?? cartState.cartItems ?? [];
    if (Array.isArray(items) && items.length > 0) {
      // each item expected to have price and qty
      try {
        let sum = 0;
        for (const it of items) {
          const p = Number(it.price ?? it.unitPrice ?? it.pricePerUnit ?? 0);
          const q = Number(it.qty ?? it.quantity ?? it.qtyOrdered ?? 1);
          const pi = Number.isNaN(p) ? 0 : p;
          const qi = Number.isNaN(q) ? 1 : q;
          sum += pi * qi;
        }
        return sum;
      } catch (e) {
        return 0;
      }
    }
    return 0;
  })();

  const subtotal = Number.isFinite(computedSubtotal) ? computedSubtotal : 0;

  useEffect(() => {
    // helpful debug when testing locally
    // eslint-disable-next-line no-console
    console.log("ShopProducts: cart subtotal read as", subtotal, "from cartState:", cartState);
  }, [subtotal]); // eslint-disable-line react-hooks/exhaustive-deps

  // compute remaining to free shipping
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  // styles
  const pageWrap = {
    padding: "24px 28px",
    minHeight: "70vh",
    position: "relative",
  };

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
    gap: 12,
    alignItems: "start",
    marginTop: 12,
  };

  // banner styles - fixed at bottom center
  const bannerWrap = {
    position: "fixed",
    bottom: 18,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 1200,
    width: "min(96%, 960px)",
  };

  const bannerStyle = {
    background: "#e9f8f0",
    borderRadius: 28,
    padding: "12px 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
    gap: 12,
  };

  const leftStyle = { display: "flex", alignItems: "center", gap: 12, fontWeight: 700, color: "#0a7b4f" };
  const rightStyle = { display: "flex", alignItems: "center", gap: 10 };

  return (
    <div style={pageWrap}>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Shop</h2>

      <div style={gridStyle}>
        {products && products.length > 0 ? (
          products.map((p) => <ShopProductCard key={p._id ?? p.slug ?? p.id} product={p} />)
        ) : (
          <div style={{ padding: 20 }}>No products found.</div>
        )}
      </div>

      {/* bottom banner */}
      <div style={bannerWrap} role="status" aria-live="polite">
        <div style={bannerStyle}>
          <div style={leftStyle}>
            {subtotal >= FREE_SHIPPING_THRESHOLD ? (
              <>
                <span style={{ fontSize: 18 }}>🎉</span>
                <div>
                  <div style={{ fontSize: 15 }}>Congrats — you are eligible for free shipping</div>
                  <div style={{ fontSize: 13, color: "#2f6f52", fontWeight: 700 }}>Subtotal ₹{subtotal.toFixed(2)}</div>
                </div>
              </>
            ) : (
              <>
                <span style={{ fontSize: 18 }}>🚚</span>
                <div>
                  <div style={{ fontSize: 15 }}>Free shipping above ₹{FREE_SHIPPING_THRESHOLD}</div>
                  <div style={{ fontSize: 13, color: "#2f6f52", fontWeight: 700 }}>
                    Subtotal ₹{subtotal.toFixed(2)}{" "}
                    <span style={{ fontWeight: 600, color: "#0a5cff" }}>
                      • Add ₹{remaining.toFixed(2)} more to get free shipping
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          <div style={rightStyle}>
            {subtotal >= FREE_SHIPPING_THRESHOLD ? (
              <button
                style={{
                  background: "#13a65f",
                  color: "#fff",
                  border: "none",
                  padding: "8px 14px",
                  borderRadius: 8,
                  fontWeight: 800,
                }}
                onClick={() => {
                  // maybe direct to checkout
                  window.location.href = "/cart";
                }}
              >
                Celebrate
              </button>
            ) : (
              <button
                style={{
                  background: "#6a0dad",
                  color: "#fff",
                  border: "none",
                  padding: "8px 14px",
                  borderRadius: 8,
                  fontWeight: 800,
                }}
                onClick={() => {
                  // scroll to products
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Shop more
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
