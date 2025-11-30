// src/shop/ShopProducts.jsx
import React, { useEffect, useState } from "react";
import ShopProductCard from "./shopProductCard";

/**
 * Safe ShopProducts.jsx
 *
 * - DOES NOT import or call any react-redux hooks to avoid crashing when Provider/store is absent.
 * - Reads cart subtotal defensively from:
 *    1) window.__PRELOADED_STATE__ or window.__REDUX_STATE__ (server-client bootstrapped states)
 *    2) localStorage keys: 'cart', 'persist:root', 'redux_state' (common patterns)
 *    3) If items array is found, computes subtotal from item.price * item.qty
 * - Displays bottom banner showing free-shipping eligibility (threshold configurable).
 *
 * This file is intentionally defensive and standalone so it won't break the page if Redux provider is missing.
 */

const FREE_SHIPPING_THRESHOLD = 999;

function safeParseJson(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}

/**
 * Try to extract a cart object or subtotal from various common places.
 * Return an object: { subtotal: number, raw: any }
 */
function readCartFromEnvironment() {
  // 1) check common window-injected state names
  const possibleWindowNames = ["__PRELOADED_STATE__", "__REDUX_STATE__", "REDUX_STATE"];
  for (const name of possibleWindowNames) {
    try {
      // eslint-disable-next-line no-undef
      const val = window?.[name];
      if (val) {
        // try common shapes
        const cart = val.cart ?? val.cartSlice ?? val.cartReducer ?? val?.root?.cart ?? val;
        const subtotal = tryComputeSubtotal(cart);
        if (typeof subtotal === "number") return { subtotal, raw: cart };
      }
    } catch (e) {
      // ignore
    }
  }

  // 2) check localStorage keys
  const lsKeys = ["cart", "persist:root", "redux_state", "reduxState", "app_state"];
  for (const k of lsKeys) {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      // persist:root commonly stores JSON stringified nested object; for redux-persist it's a stringified JSON or nested strings
      const parsed = safeParseJson(raw) ?? raw;
      // If persist:root, the cart may be nested inside parsed cart key or inside parsed as JSON strings.
      const maybe = extractCartFromParsed(parsed);
      const subtotal = tryComputeSubtotal(maybe);
      if (typeof subtotal === "number") return { subtotal, raw: maybe };
    } catch (e) {
      // ignore
    }
  }

  // 3) fallback: try window.__STORE__ or window.__APP__ style
  try {
    // eslint-disable-next-line no-undef
    const maybeStore = window?.__STORE__ ?? window?.appState ?? window?.APP_STATE;
    const subtotal = tryComputeSubtotal(maybeStore);
    if (typeof subtotal === "number") return { subtotal, raw: maybeStore };
  } catch (e) {}

  // 4) nothing found
  return { subtotal: 0, raw: null };
}

/**
 * Helper: try to extract a cart object from different serialized shapes
 */
function extractCartFromParsed(parsed) {
  if (!parsed) return null;
  // redux-persist persist:root often contains JSON with keys that are stringified JSON; try a few patterns
  if (typeof parsed === "object") {
    if (parsed.cart) return parsed.cart;
    if (parsed.root && parsed.root.cart) return parsed.root.cart;
    // if parsed has a key 'persist:root' or similar
    for (const k of Object.keys(parsed)) {
      const v = parsed[k];
      if (k.toLowerCase().includes("cart")) return v;
      // sometimes values themselves are stringified JSON
      if (typeof v === "string") {
        const nested = safeParseJson(v);
        if (nested && nested.cart) return nested.cart;
      }
    }
  }
  // nothing useful
  return parsed;
}

/**
 * Try to compute subtotal from many shapes:
 * - object with subtotal/total fields
 * - object with items array where each item has price & qty
 */
function tryComputeSubtotal(cartLike) {
  if (!cartLike) return null;

  // If it's a number already
  if (typeof cartLike === "number") return Number(cartLike);

  // If it's an object with subtotal-like fields
  const subtotalCandidates = ["subtotal", "total", "cartTotal", "grandTotal"];
  for (const k of subtotalCandidates) {
    if (typeof cartLike[k] === "number") return cartLike[k];
    if (typeof cartLike[k] === "string" && !Number.isNaN(Number(cartLike[k]))) return Number(cartLike[k]);
  }

  // If it has items array
  const items = cartLike.items ?? cartLike.cartItems ?? cartLike.lineItems ?? null;
  if (Array.isArray(items) && items.length) {
    let sum = 0;
    for (const it of items) {
      const p = Number(it.price ?? it.unitPrice ?? it.pricePerUnit ?? it.rate ?? 0);
      const q = Number(it.qty ?? it.quantity ?? it.count ?? 1);
      const pi = Number.isNaN(p) ? 0 : p;
      const qi = Number.isNaN(q) ? 1 : q;
      sum += pi * qi;
    }
    return sum;
  }

  // Also: if cartLike itself is an array of items
  if (Array.isArray(cartLike) && cartLike.length) {
    let sum2 = 0;
    for (const it of cartLike) {
      const p = Number(it.price ?? it.unitPrice ?? 0);
      const q = Number(it.qty ?? it.quantity ?? 1);
      const pi = Number.isNaN(p) ? 0 : p;
      const qi = Number.isNaN(q) ? 1 : q;
      sum2 += pi * qi;
    }
    return sum2;
  }

  return null;
}

export default function ShopProducts({ products = [] }) {
  // store subtotal in local state so banner updates when component mounts or localStorage changes
  const [subtotal, setSubtotal] = useState(0);

  useEffect(() => {
    function readAndSet() {
      const cart = readCartFromEnvironment();
      setSubtotal(Number.isFinite(cart.subtotal) ? cart.subtotal : 0);
    }

    // initial read
    readAndSet();

    // listen to storage events (so if user adds in another tab, banner updates)
    function handleStorage(e) {
      const keysWeCare = ["cart", "persist:root", "redux_state"];
      if (!e.key || keysWeCare.includes(e.key)) {
        readAndSet();
      }
    }
    window.addEventListener("storage", handleStorage);

    // also poll briefly to catch single-page app updates if they write to localStorage
    const poll = setInterval(readAndSet, 1500);

    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(poll);
    };
  }, []);

  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  // styles (same as previous, minimal and safe)
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
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Continue shopping
              </button>
            )}

            <button
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "#333",
                fontWeight: 700,
                textDecoration: "underline",
                cursor: "pointer",
              }}
            >
              Dismiss ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
