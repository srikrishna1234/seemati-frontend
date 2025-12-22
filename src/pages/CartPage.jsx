// src/pages/CartPage.jsx
import React, { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  loadCart,
  computeTotals,
  SHIPPING_THRESHOLD,
  setItemQuantity,
  removeItem,
  clearCart,
} from "../utils/cartHelpers";
import { useCartState, useCartDispatch } from "../context/CartContext";
// ---------- SAVE FOR LATER (WISHLIST) ----------
const WISHLIST_KEY = "wishlist_v1";

function loadWishlist() {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY) || "[]";
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveWishlist(arr) {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(arr));
  window.dispatchEvent(new Event("wishlist-updated"));
}

/* burst animation */
function burstAt(containerEl, options = {}) {
  if (!containerEl) containerEl = document.body;
  const { count = 20, spread = 160, lifetime = 900, colors = ["#f59e0b", "#ef4444", "#10b981", "#0b5cff", "#7c3aed"] } = options;

  const rect = containerEl.getBoundingClientRect();
  const wrapper = document.createElement("div");
  wrapper.style.position = "absolute";
  wrapper.style.left = `${rect.left + window.scrollX}px`;
  wrapper.style.top = `${rect.top + window.scrollY}px`;
  wrapper.style.width = `${rect.width}px`;
  wrapper.style.height = `${rect.height}px`;
  wrapper.style.pointerEvents = "none";
  wrapper.style.zIndex = 9999;
  document.body.appendChild(wrapper);

  const cx = rect.width / 2;
  const cy = rect.height / 2;

  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    const size = Math.floor(Math.random() * 8) + 6;
    el.style.position = "absolute";
    el.style.left = `${cx}px`;
    el.style.top = `${cy}px`;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.borderRadius = "4px";
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    wrapper.appendChild(el);
  }

  setTimeout(() => wrapper.remove(), lifetime);
}

export default function CartPage() {
	const navigate = useNavigate();

  const ctx = useCartState();
  const cartDispatch = useCartDispatch();

  const [items, setItems] = useState(() => {
  if (Array.isArray(ctx?.items)) return ctx.items;

  const raw = loadCart();
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.items)) return raw.items;

  return [];
});
  const [showBanner, setShowBanner] = useState(true);
// saved-for-later items
const [savedItems, setSavedItems] = useState(() => loadWishlist());

  useEffect(() => {
  if (Array.isArray(ctx?.items)) {
    setItems(ctx.items);
  }
}, [ctx?.items]);

useEffect(() => {
  setSavedItems(loadWishlist());
}, []);

  const totals = useMemo(() => computeTotals({ items }), [items]);
  const leftForFree = Math.max(0, SHIPPING_THRESHOLD - (totals.subtotal || 0));

  function persistAndSync(saved) {
  const itemsArray = Array.isArray(saved)
    ? saved
    : Array.isArray(saved?.items)
    ? saved.items
    : [];

  cartDispatch({ type: "INITIALIZE", payload: { items: itemsArray } });
  setItems(itemsArray);
}


  if (!items.length) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Your cart is empty</h2>
        <Link to="/shop">Go shopping</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Back + Title */}
     <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
  <button
    onClick={() => navigate(-1)}
    style={{
      border: "none",
      background: "transparent",
      fontSize: 18,
      cursor: "pointer",
    }}
  >
    ← Back
  </button>
  <h1 style={{ margin: 0 }}>Your Cart</h1>
</div>


      {/* Free Shipping Banner */}
      {showBanner && (
        <div
          style={{
            margin: "16px 0",
            background: "#e6fffa",
            border: "1px solid #bbf7d0",
            padding: "12px 18px",
            borderRadius: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {leftForFree > 0 ? (
            <div>
              📦 Add ₹{leftForFree.toFixed(2)} more for free shipping (Subtotal ₹
              {(totals.subtotal || 0).toFixed(2)})
            </div>
          ) : (
            <div>
              🎉 You have free shipping! Subtotal ₹{(totals.subtotal || 0).toFixed(2)}
            </div>
          )}
          <button onClick={() => setShowBanner(false)} style={{ border: "none", background: "transparent" }}>
            ✕
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: 24 }}>
        <div style={{ flex: 1 }}>
          {items.map((it) => {
            const id = it.productId || it._id;
            return (
              <div
  key={id}
  style={{
    border: "1px solid #eee",
    padding: 12,
    marginBottom: 12,
    display: "flex",
    gap: 16,
    alignItems: "center",
  }}
>
  {/* Product image */}
  <div
    style={{
      width: 90,
      height: 120,
      border: "1px solid #f3f3f3",
      borderRadius: 6,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#fff",
      overflow: "hidden",
    }}
  >
    <img
      src={
        it.image ||
        it.images?.[0]?.url ||
        it.images?.[0] ||
        "/images/placeholder.png"
      }
      alt={it.title}
      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
      onError={(e) => (e.target.src = "/images/placeholder.png")}
    />
  </div>

  {/* Product info */}
  <div style={{ flex: 1 }}>
    <strong>{it.title}</strong>
    <div style={{ marginTop: 6 }}>₹{it.price}</div>

                <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                  <button onClick={() => persistAndSync(setItemQuantity(id, (it.quantity || 1) - 1))}>-</button>
                  <span>{it.quantity || 1}</span>
                  <button onClick={() => persistAndSync(setItemQuantity(id, (it.quantity || 1) + 1))}>+</button>

                  <button
  onClick={() => {
    // remove from cart
    persistAndSync(removeItem(id));

    // add to wishlist
    const wishlist = loadWishlist();
    const exists = wishlist.some(w => w.productId === id);

    if (!exists) {
      wishlist.push(it);
      saveWishlist(wishlist);
      setSavedItems(wishlist);
    }
  }}
>
  Save for later
</button>
                  <button onClick={() => persistAndSync(removeItem(id))} style={{ color: "red" }}>
                    Remove
                  </button>
                </div>
              </div>
			   </div> 
            );
          })}
        </div>

        <aside style={{ width: 300 }}>
          <div style={{ border: "1px solid #eee", padding: 16 }}>
            <div>Subtotal: ₹{(totals.subtotal || 0).toFixed(2)}</div>
            <div>Shipping: {totals.shipping === 0 ? "FREE" : totals.shipping}</div>
            <strong>Total: ₹{(totals.total || 0).toFixed(2)}</strong>

            <button style={{ width: "100%", marginTop: 12 }}>Proceed to Checkout</button>
            <button onClick={() => persistAndSync(clearCart())} style={{ width: "100%", marginTop: 8 }}>
              Clear cart
            </button>
          </div>
        </aside>
      </div>
	  {/* Saved for later section */}
{savedItems.length > 0 && (
  <div style={{ marginTop: 32 }}>
    <h2>Saved for later</h2>

    {savedItems.map((it) => (
      <div
        key={it.productId}
        style={{
          border: "1px dashed #ddd",
          padding: 12,
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <img
          src={it.image || "/images/placeholder.png"}
          alt={it.title}
          style={{ width: 60, height: 80, objectFit: "contain" }}
        />

        <div style={{ flex: 1 }}>
          <strong>{it.title}</strong>
          <div>₹{it.price}</div>
        </div>

        <button
          onClick={() => {
            cartDispatch({ type: "ADD_ITEM", payload: { ...it, quantity: 1 } });
            const updated = loadWishlist().filter(
              (x) => x.productId !== it.productId
            );
            saveWishlist(updated);
            setSavedItems(updated);
          }}
        >
          Move to cart
        </button>
      </div>
    ))}
  </div>
)}

    </div>
  );
}
