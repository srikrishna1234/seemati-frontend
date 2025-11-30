// src/shop/ShopProducts.jsx
import React, { useEffect, useState } from "react";
import ShopProductCard from "./shopProductCard";

/**
 * Safe ShopProducts.jsx (updated)
 * - Adds bottom padding so the fixed free-shipping banner doesn't overlap product card footers.
 * - Keeps defensive cart reading and product fetching.
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

  // NOTE: increased paddingBottom so banner (fixed) doesn't overlap product card footers.
  const pageWrap = { padding: "24px 28px", paddingBottom: "160px", minHeight: "70vh", position: "relative" };
  const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 12, alignItems: "start", marginTop: 12 };
  const bannerWrap = { position: "fixed", bottom: 18, left: "50%", transform: "translateX(-50%)", zIndex: 1200, width: "min(96%, 960px)" };
  const bannerStyle = { background: "#e9f8f0", borderRadius: 28, padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 6px 20px rgba(0,0,0,0.06)", gap: 12 };
  const leftStyle = { display: "flex", alignItems: "center", gap: 12, fontWeight: 700, color: "#0a7b4f" };
  const rightStyle = { display: "flex", alignItems: "center", gap: 10 };

  return (
    <div style={pageWrap}>
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
              <button style={{ background: "#13a65f", color: "#fff", border: "none", padding: "8px 14px", borderRadius: 8, fontWeight: 800 }} onClick={() => window.location.href = "/cart"}>
                Celebrate
              </button>
            ) : (
              <button style={{ background: "#6a0dad", color: "#fff", border: "none", padding: "8px 14px", borderRadius: 8, fontWeight: 800 }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                Continue shopping
              </button>
            )}

            <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} style={{ background: "transparent", border: "none", color: "#333", fontWeight: 700, textDecoration: "underline", cursor: "pointer" }}>
              Dismiss ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
