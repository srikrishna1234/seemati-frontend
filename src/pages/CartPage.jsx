// src/pages/CartPage.jsx
import React, { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { loadCart, computeTotals, SHIPPING_THRESHOLD, setItemQuantity, removeItem, clearCart } from "../utils/cartHelpers";
import { useCartState, useCartDispatch } from "../context/CartContext";

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
  wrapper.style.overflow = "visible";
  wrapper.style.zIndex = 9999;
  document.body.appendChild(wrapper);

  const cx = rect.width / 2;
  const cy = rect.height / 2;
  const particles = [];

  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    const size = Math.floor(Math.random() * 8) + 6;
    el.style.position = "absolute";
    el.style.left = `${cx - size / 2}px`;
    el.style.top = `${cy - size / 2}px`;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.borderRadius = "4px";
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.opacity = "1";
    el.style.transform = "translate3d(0,0,0) scale(1)";
    el.style.willChange = "transform, opacity";
    wrapper.appendChild(el);

    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * (spread / 30);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed - Math.random() * 1.5;
    const rot = (Math.random() - 0.5) * 10;
    particles.push({ el, x: cx, y: cy, vx, vy, rot });
  }

  const start = performance.now();
  function frame(t) {
    const dt = t - start;
    const norm = Math.min(1, dt / lifetime);
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.06;
      const scale = 1 - norm * 0.6;
      p.el.style.transform = `translate3d(${p.x - cx}px, ${p.y - cy}px, 0) rotate(${p.rot * norm}deg) scale(${Math.max(0.2, scale)})`;
      p.el.style.opacity = String(1 - norm);
    });
    if (norm < 1) requestAnimationFrame(frame);
    else setTimeout(() => { try { wrapper.remove(); } catch {} }, 60);
  }
  requestAnimationFrame(frame);
}

/* single-run burst helper */
function checkAndTriggerBurst(subtotal, containerEl) {
  try {
    const KEY = "seemati_free_burst_done_v1";
    const done = localStorage.getItem(KEY) === "1";
    if (subtotal >= SHIPPING_THRESHOLD && !done) {
      burstAt(containerEl || document.body, { count: 36, spread: 220, lifetime: 1000 });
      localStorage.setItem(KEY, "1");
    } else if (subtotal < SHIPPING_THRESHOLD && done) {
      localStorage.removeItem(KEY);
    }
  } catch (e) {
    console.warn("burst check failed", e);
  }
}

function safeLoadItems() {
  try {
    const raw = loadCart();
    const arr = Array.isArray(raw) ? raw : raw.items ?? [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

export default function CartPage() {
  const ctx = useCartState();
  const cartDispatch = useCartDispatch();

  const [items, setItems] = useState(() => ctx?.items ?? safeLoadItems());

  // sync local items when context changes
  useEffect(() => {
    setItems(ctx?.items ?? safeLoadItems());
  }, [ctx?.items]);

  // recompute totals when items change
  const totals = useMemo(() => computeTotals({ items }), [items]);

  // show floating banner state
  const [showBanner, setShowBanner] = useState(true);

  // helper to persist via helpers and sync context
  function persistAndSync(savedCart) {
    const normalized = Array.isArray(savedCart) ? { items: savedCart } : (savedCart || { items: [] });
    try { if (typeof cartDispatch === "function") cartDispatch({ type: "INITIALIZE", payload: normalized }); } catch (err) { console.warn("[CartPage] dispatch init failed", err); }
    try { window.dispatchEvent(new Event("cart-updated")); } catch (e) {}
    setItems(normalized.items || []);
    try {
      const comp = computeTotals(normalized);
      checkAndTriggerBurst(comp.subtotal || 0, document.body);
    } catch (e) {}
  }

  async function updateQty(productId, nextQty) {
    const normalizedQty = Math.max(0, Math.floor(Number(nextQty) || 0));
    if (normalizedQty <= 0) {
      const saved = removeItem(productId);
      persistAndSync(saved);
      return;
    }
    const saved = setItemQuantity(productId, normalizedQty);
    persistAndSync(saved);
  }

  async function handleRemove(productId) {
    const saved = removeItem(productId);
    persistAndSync(saved);
  }

  function handleClear() {
    const saved = clearCart();
    persistAndSync(saved);
  }

  const leftForFree = Math.max(0, (SHIPPING_THRESHOLD - (totals.subtotal || 0)));

  if (!items || items.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Your cart is empty</h2>
        <Link to="/shop">Go shopping</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Your Cart</h1>

      <div style={{ display: "flex", gap: 24 }}>
        <div style={{ flex: "1 1 auto" }}>
          {items.map((it) => {
            const id = it.productId ?? it._id ?? it.id ?? "";
            const imgSrc = it.image ?? (it.images && it.images[0] && (it.images[0].url || it.images[0])) ?? `${process.env.REACT_APP_API_URL || "http://localhost:4000"}/uploads/placeholder.png`;
            return (
              <div key={id} style={{ border: "1px solid #eee", padding: 12, marginBottom: 12, borderRadius: 6, display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 96, height: 96, borderRadius: 6, overflow: "hidden", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #f3f3f3" }}>
                  <img src={imgSrc} alt={it.title} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }} onError={(e) => e.target.src = `${process.env.REACT_APP_API_URL || "http://localhost:4000"}/uploads/placeholder.png`} />
                </div>

                <div style={{ flex: "1 1 auto" }}>
                  <div style={{ fontWeight: 700 }}>{it.title}</div>
                  <div style={{ marginTop: 8 }}>Price: ₹{Number(it.price ?? 0).toFixed(2)}</div>
                  <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
                    <button onClick={() => updateQty(id, (Number(it.quantity ?? it.qty ?? 1) || 1) - 1)} style={{ width: 36, height: 28 }}>-</button>
                    <input value={it.quantity ?? it.qty ?? 1} onChange={(e) => updateQty(id, Number(e.target.value || 0))} style={{ width: 48, textAlign: "center" }} />
                    <button onClick={() => updateQty(id, (Number(it.quantity ?? it.qty ?? 1) || 1) + 1)} style={{ width: 36, height: 28 }}>+</button>
                    <button onClick={() => handleRemove(id)} style={{ marginLeft: "auto", color: "#dc2626", background: "transparent", border: "none", cursor: "pointer" }}>Remove</button>
                  </div>
                </div>

                <div style={{ minWidth: 120, textAlign: "right", fontWeight: 800 }}>₹{((Number(it.price ?? 0) * (it.quantity ?? it.qty ?? 1)) || 0).toFixed(2)}</div>
              </div>
            );
          })}
        </div>

        <aside style={{ width: 320 }}>
          <div style={{ border: "1px solid #eee", padding: 16, borderRadius: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>Items</div>
              <div>{items.reduce((s, it) => s + (Number(it.quantity ?? it.qty ?? 1) || 0), 0)}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <div>Subtotal</div>
              <div>₹{(totals.subtotal ?? 0).toFixed(2)}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <div>Shipping</div>
              <div>{totals.shipping === 0 ? "FREE" : `₹${totals.shipping.toFixed(2)}`}</div>
            </div>
            <div style={{ marginTop: 12, fontWeight: 800, display: "flex", justifyContent: "space-between" }}>
              <div>Total</div>
              <div>₹{(totals.total ?? 0).toFixed(2)}</div>
            </div>

            <div style={{ marginTop: 12 }}>
              <button style={{ width: "100%", padding: "10px 12px", background: "#0b5cff", color: "#fff", borderRadius: 6, border: "none" }}>
                Proceed to Checkout
              </button>
            </div>

            <div style={{ marginTop: 8 }}>
              <button onClick={handleClear} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", background: "#fff", marginTop: 8 }}>
                Clear cart
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Floating free-shipping banner */}
      <div
        aria-hidden="false"
        style={{
          position: "fixed",
          left: 20,
          right: 20,
          bottom: 20,
          margin: "0 auto",
          maxWidth: 980,
          background: "#e6fffa",
          border: "1px solid #bbf7d0",
          color: "#064e3b",
          padding: "12px 18px",
          borderRadius: 999,
          boxShadow: "0 6px 18px rgba(2,6,23,0.06)",
          display: showBanner ? "flex" : "none",
          alignItems: "center",
          gap: 12,
          justifyContent: "center",
          zIndex: 9999,
        }}
      >
        {leftForFree > 0 ? (
          <>
            <span style={{ fontWeight: 700 }}>📦</span>
            <div style={{ fontWeight: 700 }}>Add ₹{leftForFree.toFixed(2)} more to get free shipping.</div>
            <div style={{ color: "#065f46" }}>Subtotal ₹{(totals.subtotal || 0).toFixed(2)}</div>
            <Link to="/shop"><button style={{ marginLeft: 12, background: "#0b5cff", color: "#fff", padding: "8px 12px", borderRadius: 6, border: "none" }}>Continue shopping</button></Link>
          </>
        ) : (
          <>
            <span style={{ fontWeight: 700 }}>🎉</span>
            <div style={{ fontWeight: 700 }}>You have free shipping! Subtotal ₹{(totals.subtotal || 0).toFixed(2)}</div>
            <button onClick={() => burstAt(document.body, { count: 36 })} style={{ marginLeft: 12, background: "#10b981", color: "#fff", padding: "8px 12px", borderRadius: 6, border: "none" }}>
              Celebrate
            </button>
          </>
        )}

        <button onClick={() => setShowBanner(false)} style={{ marginLeft: 12, background: "transparent", border: "none", cursor: "pointer" }}>Dismiss ✕</button>
      </div>
    </div>
  );
}
