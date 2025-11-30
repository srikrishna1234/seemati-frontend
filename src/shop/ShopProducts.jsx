// src/shop/ShopProducts.jsx
import React, { useEffect, useState } from "react";
import ShopProductCard from "./shopProductCard";

/**
 * Safe ShopProducts.jsx (updated)
 * - Adds bottom padding so the fixed free-shipping banner doesn't overlap product card footers.
 * - Keeps defensive cart reading and product fetching.
 * - ONLY UI changes: reduced top gap (lift products), and added a running announcement ticker
 *   directly below the site header (red bar, continuous scroll) — no other logic changes.
 */

const FREE_SHIPPING_THRESHOLD = 999;

let axiosInstance = null;
try {
  // dynamic require to avoid bundler errors if file missing
  // eslint-disable-next-line global-require
  axiosInstance = require("../api/axiosInstance").default;
} catch (e) {
  axiosInstance = null;
}

function safeParseJson(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}

function tryComputeSubtotal(cartLike) {
  if (!cartLike) return null;
  if (typeof cartLike === "number") return Number(cartLike);
  const subtotalCandidates = ["subtotal", "total", "cartTotal", "grandTotal"];
  for (const k of subtotalCandidates) {
    if (typeof cartLike[k] === "number") return cartLike[k];
    if (typeof cartLike[k] === "string" && !Number.isNaN(Number(cartLike[k]))) return Number(cartLike[k]);
  }
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

function extractCartFromParsed(parsed) {
  if (!parsed) return null;
  if (parsed.cart) return parsed.cart;
  if (parsed.root && parsed.root.cart) return parsed.root.cart;
  for (const k of Object.keys(parsed)) {
    const v = parsed[k];
    if (k.toLowerCase().includes("cart")) return v;
    if (typeof v === "string") {
      const nested = safeParseJson(v);
      if (nested && nested.cart) return nested.cart;
    }
  }
  return parsed;
}

function readCartFromEnvironment() {
  const possibleWindowNames = ["__PRELOADED_STATE__", "__REDUX_STATE__", "REDUX_STATE"];
  for (const name of possibleWindowNames) {
    try {
      const val = window?.[name];
      if (val) {
        const cart = val.cart ?? val.cartSlice ?? val.cartReducer ?? val?.root?.cart ?? val;
        const subtotal = tryComputeSubtotal(cart);
        if (typeof subtotal === "number") return { subtotal, raw: cart };
      }
    } catch (e) {}
  }

  const lsKeys = ["cart", "persist:root", "redux_state", "reduxState", "app_state"];
  for (const k of lsKeys) {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const parsed = safeParseJson(raw) ?? raw;
      const maybe = extractCartFromParsed(parsed);
      const subtotal = tryComputeSubtotal(maybe);
      if (typeof subtotal === "number") return { subtotal, raw: maybe };
    } catch (e) {}
  }

  try {
    const maybeStore = window?.__STORE__ ?? window?.appState ?? window?.APP_STATE;
    const subtotal = tryComputeSubtotal(maybeStore);
    if (typeof subtotal === "number") return { subtotal, raw: maybeStore };
  } catch (e) {}

  return { subtotal: 0, raw: null };
}

/* Announcement ticker defaults — you can change this text in future by editing the string below */
const DEFAULT_ANNOUNCEMENT = "⦿ Free Shipping on orders above ₹999 • Get 10% off on prepaid orders above ₹1499 • New arrivals added weekly!";

export default function ShopProducts({ products = [] }) {
  const [localProducts, setLocalProducts] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [subtotal, setSubtotal] = useState(0);

  useEffect(() => {
    function update() {
      const c = readCartFromEnvironment();
      setSubtotal(Number.isFinite(c.subtotal) ? c.subtotal : 0);
    }
    update();
    function onStorage(e) {
      const keysWeCare = ["cart", "persist:root", "redux_state"];
      if (!e.key || keysWeCare.includes(e.key)) update();
    }
    window.addEventListener("storage", onStorage);
    const poll = setInterval(update, 1500);
    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(poll);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchProducts() {
      if (Array.isArray(products) && products.length > 0) return;
      setLoading(true);
      setFetchError(null);
      try {
        if (axiosInstance) {
          const resp = await axiosInstance.get("/api/products?limit=100");
          const data = resp?.data ?? resp;
          let items = null;
          if (Array.isArray(data)) items = data;
          else if (Array.isArray(data.docs)) items = data.docs;
          else if (Array.isArray(data.products)) items = data.products;
          else if (Array.isArray(data.data)) items = data.data;
          else items = data;
          if (!cancelled) setLocalProducts(Array.isArray(items) ? items : []);
        } else {
          const r = await fetch("/api/products?limit=100");
          if (!r.ok) throw new Error(`fetch /api/products failed: ${r.status}`);
          const j = await r.json();
          let items = null;
          if (Array.isArray(j)) items = j;
          else if (Array.isArray(j.docs)) items = j.docs;
          else if (Array.isArray(j.products)) items = j.products;
          else if (Array.isArray(j.data)) items = j.data;
          else items = j;
          if (!cancelled) setLocalProducts(Array.isArray(items) ? items : []);
        }
      } catch (err) {
        if (!cancelled) {
          setFetchError(err.message || String(err));
          setLocalProducts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchProducts();
    return () => {
      cancelled = true;
    };
  }, []); // run once

  const productsToShow = (Array.isArray(products) && products.length > 0) ? products : (Array.isArray(localProducts) ? localProducts : []);

  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  // ---------- LIFT PRODUCTS: reduced top padding & smaller grid marginTop ----------
  // reduced top padding so product grid sits a bit higher under header (no overlap)
  const pageWrap = { padding: "12px 28px 160px 28px", minHeight: "70vh", position: "relative" };
  // smaller marginTop so the grid moves up — adjust if you want it closer/further
  const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 12, alignItems: "start", marginTop: 8 };

  // Announcement ticker bar wrap (will appear under the site header, above the Shop title)
  const tickerWrap = { width: "100%", overflow: "hidden", marginBottom: 12 };

  // Banner (free shipping) wrap stays fixed at bottom
  const bannerWrap = { position: "fixed", bottom: 18, left: "50%", transform: "translateX(-50%)", zIndex: 1200, width: "min(96%, 960px)" };

  // Banner: kept compact single-line from earlier
  const bannerStyle = {
    background: "#e9f8f0",
    borderRadius: 28,
    padding: "6px 14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
    gap: 12,
    whiteSpace: "nowrap",
    height: 48,
    overflow: "hidden",
  };
  const leftStyle = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontWeight: 700,
    color: "#0a7b4f",
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };
  const rightStyle = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    whiteSpace: "nowrap",
  };

  // Announcement ticker styles (uses inline <style> keyframes below)
  const tickerOuterStyle = {
    background: "#d9303e", // red bar
    color: "#fff",
    padding: "6px 12px",
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    height: 34,
  };
  const tickerInnerMask = {
    overflow: "hidden",
    width: "100%",
    marginLeft: 8,
  };
  const tickerTextStyle = {
    display: "inline-block",
    whiteSpace: "nowrap",
    paddingLeft: "100%", // start off-screen on the right
    fontWeight: 700,
  };

  // Note: simple accessible ticker using CSS animation. If you want different text speed, adjust '12s' below.
  return (
    <div style={pageWrap}>
      {/* Inline keyframes and helper classes for the ticker animation */}
      <style>{`
        @keyframes seematiTicker {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-100%); }
        }
        .seemati-ticker-inner {
          display: inline-block;
          padding-left: 100%;
          animation: seematiTicker 18s linear infinite;
        }
        /* reduces animation motion on prefers-reduced-motion */
        @media (prefers-reduced-motion: reduce) {
          .seemati-ticker-inner {
            animation: none;
            padding-left: 0;
          }
        }
      `}</style>

      {/* Announcement ticker: sits under header (Shop title will follow) */}
      <div style={tickerWrap} aria-hidden={false}>
        <div style={tickerOuterStyle} role="region" aria-label="Site announcements">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flex: "0 0 auto" }}>
            <path d="M3 10a1 1 0 0 1 .894-.553H6V8a4 4 0 0 1 4-4h4v2h-4a2 2 0 0 0-2 2v1h2l.447.894A2 2 0 0 1 12 14H6a1 1 0 0 1-1-1v-2H3.894A1 1 0 0 1 3 10z" fill="#fff" />
          </svg>

          <div style={tickerInnerMask}>
            <div className="seemati-ticker-inner" style={tickerTextStyle}>
              {DEFAULT_ANNOUNCEMENT} &nbsp; • &nbsp; {DEFAULT_ANNOUNCEMENT}
            </div>
          </div>
        </div>
      </div>

      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Shop</h2>

      {loading ? (
        <div style={{ padding: 20 }}>Loading products…</div>
      ) : fetchError ? (
        <div style={{ padding: 20, color: "crimson" }}>Error loading products: {fetchError}</div>
      ) : productsToShow.length === 0 ? (
        <div style={{ padding: 20 }}>No products found.</div>
      ) : (
        <div style={gridStyle}>
          {productsToShow.map((p) => <ShopProductCard key={p._id ?? p.slug ?? p.id} product={p} />)}
        </div>
      )}

      <div style={bannerWrap} role="status" aria-live="polite">
        <div style={bannerStyle}>
          <div style={leftStyle}>
            <span style={{ fontSize: 18, flex: "0 0 auto" }}>{subtotal >= FREE_SHIPPING_THRESHOLD ? "🎉" : "🚚"}</span>

            {subtotal >= FREE_SHIPPING_THRESHOLD ? (
              <span style={{ fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                Congrats — eligible • Subtotal ₹{subtotal.toFixed(2)}
              </span>
            ) : (
              <span style={{ fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                Free shipping above ₹{FREE_SHIPPING_THRESHOLD} • Subtotal ₹{subtotal.toFixed(2)} • Add ₹{remaining.toFixed(2)}
              </span>
            )}
          </div>

          <div style={rightStyle}>
            {subtotal >= FREE_SHIPPING_THRESHOLD ? (
              <button
                style={{ background: "#13a65f", color: "#fff", border: "none", padding: "6px 10px", borderRadius: 8, fontWeight: 800 }}
                onClick={() => (window.location.href = "/cart")}
              >
                Celebrate
              </button>
            ) : (
              <button
                style={{ background: "#6a0dad", color: "#fff", border: "none", padding: "6px 10px", borderRadius: 8, fontWeight: 800 }}
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              >
                Continue shopping
              </button>
            )}

            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              style={{ background: "transparent", border: "none", color: "#333", fontWeight: 700, textDecoration: "underline", cursor: "pointer", padding: "4px 6px" }}
            >
              Dismiss ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
