// src/shop/ShopProducts.jsx
import React, { useEffect, useState, useRef } from "react";
import ShopProductCard from "./shopProductCard";

/**
 * ShopProducts.jsx (full replacement)
 *
 * Improvements included:
 * 1. Forces the free-shipping banner into a single-line layout (no wrapping).
 * 2. Reduces banner height/padding for a tighter look.
 * 3. Saves "Dismiss" state in localStorage so the user choice persists across pages.
 * 4. Debounces/limits subtotal reads and listens to storage events (keeps cart sync efficient).
 * 5. Dispatches a custom 'seemati:storage-sync' event on storage changes so other components
 *    (eg. shopProductCard / wishlist components) can react if they subscribe.
 * 6. Preloads primary product images (simple Image prefetch) to reduce perceived load flicker.
 * 7. Keeps defensive fetching (uses axiosInstance if present, falls back to fetch).
 * 8. Adds accessibility attributes (role/status and polite announcements).
 *
 * Notes:
 * - This file intentionally avoids external CSS dependencies; inline styles/tailwind-friendly classes used.
 * - If you prefer Tailwind classes, replace style objects with className strings.
 */

const FREE_SHIPPING_THRESHOLD = 999;
const DISMISS_LS_KEY = "seemati:freeShippingDismiss";

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
    } catch (e) { /* ignore */ }
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
    } catch (e) { /* ignore */ }
  }

  try {
    const maybeStore = window?.__STORE__ ?? window?.appState ?? window?.APP_STATE;
    const subtotal = tryComputeSubtotal(maybeStore);
    if (typeof subtotal === "number") return { subtotal, raw: maybeStore };
  } catch (e) { /* ignore */ }

  return { subtotal: 0, raw: null };
}

export default function ShopProducts({ products = [] }) {
  const [localProducts, setLocalProducts] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [subtotal, setSubtotal] = useState(0);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_LS_KEY) === "1";
    } catch (e) {
      return false;
    }
  });

  const lastCartRef = useRef(null);
  const updateTimerRef = useRef(null);

  // Read cart periodically and from storage events, but debounce updates to avoid UI thrash.
  useEffect(() => {
    function readAndMaybeUpdate() {
      const c = readCartFromEnvironment();
      const newSubtotal = Number.isFinite(c.subtotal) ? Number(c.subtotal) : 0;
      // only update if value changed meaningfully (2 decimal places)
      if (lastCartRef.current === null || Math.abs(lastCartRef.current - newSubtotal) > 0.005) {
        lastCartRef.current = newSubtotal;
        // debounce quick flurries
        if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
        updateTimerRef.current = setTimeout(() => {
          setSubtotal(newSubtotal);
        }, 300);
      }
    }

    readAndMaybeUpdate();

    function onStorage(e) {
      // Notify any listeners (wishlist, other components) that storage changed
      try {
        const keysWeCare = ["cart", "persist:root", "redux_state", "wishlist", "favorites"];
        if (!e.key || keysWeCare.includes(e.key)) {
          // read updated cart
          readAndMaybeUpdate();
          // dispatch a custom event to let other components react (eg. wishlist sync)
          try {
            window.dispatchEvent(new CustomEvent("seemati:storage-sync", { detail: { key: e.key } }));
          } catch (err) { /* silent */ }
        }
      } catch (err) { /* ignore */ }
    }
    window.addEventListener("storage", onStorage);

    // Poll as fallback (slower: every 2s)
    const poll = setInterval(readAndMaybeUpdate, 2000);

    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(poll);
      if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
    };
  }, []);

  // Fetch products once if none passed in props
  useEffect(() => {
    let cancelled = false;
    async function fetchProducts() {
      if (Array.isArray(products) && products.length > 0) {
        setLocalProducts(products);
        return;
      }
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
  }, [products]);

  // Preload primary product images (simple, light-weight)
  useEffect(() => {
    const list = Array.isArray(products) && products.length > 0 ? products : Array.isArray(localProducts) ? localProducts : [];
    if (!list || list.length === 0) return;
    // Only preload the first image per product and limit to first 30 products to avoid OOM/network flood.
    const toPreload = list.slice(0, 30).map((p) => {
      // try multiple common fields
      if (Array.isArray(p.images) && p.images.length) return p.images[0];
      if (Array.isArray(p.imgs) && p.imgs.length) return p.imgs[0];
      if (p.image) return p.image;
      if (p.thumbnail) return p.thumbnail;
      if (p.imageUrl) return p.imageUrl;
      if (p.src) return p.src;
      return null;
    }).filter(Boolean);

    const imgs = [];
    for (const src of toPreload) {
      try {
        const img = new Image();
        img.src = src;
        imgs.push(img);
      } catch (e) { /* ignore */ }
    }
    // no cleanup necessary for Image objects
  }, [localProducts, products]);

  const productsToShow = (Array.isArray(products) && products.length > 0) ? products : (Array.isArray(localProducts) ? localProducts : []);

  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  // Layout styles (inline so easy to tweak)
  const pageWrap = { padding: "24px 28px", paddingBottom: "140px", minHeight: "70vh", position: "relative" };
  const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 12, alignItems: "start", marginTop: 12 };
  const bannerWrap = { position: "fixed", bottom: 18, left: "50%", transform: "translateX(-50%)", zIndex: 1200, width: "min(96%, 960px)" };
  // Banner: make it compact and force single line
  const bannerStyle = {
    background: "#e9f8f0",
    borderRadius: 28,
    padding: "8px 12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
    gap: 12,
    maxHeight: 56,
    overflow: "hidden",
  };
  // Left: text block - force no wrap and ellipsis for long text
  const leftStyle = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    fontWeight: 700,
    color: "#0a7b4f",
    whiteSpace: "nowrap",
    minWidth: 0, // needed for textOverflow to work in flexbox
  };
  const leftTextWrap = {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    overflow: "hidden",
  };
  const mainLineStyle = {
    fontSize: 14,
    textOverflow: "ellipsis",
    overflow: "hidden",
    whiteSpace: "nowrap",
  };
  const subLineStyle = {
    fontSize: 12,
    color: "#2f6f52",
    fontWeight: 700,
    textOverflow: "ellipsis",
    overflow: "hidden",
    whiteSpace: "nowrap",
  };

  // Right side buttons - keep compact and not wrap
  const rightStyle = { display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" };

  function handleDismiss() {
    try {
      localStorage.setItem(DISMISS_LS_KEY, "1");
    } catch (e) { /* ignore */ }
    setDismissed(true);
  }

  function handleCelebrateOrContinue() {
    // If eligible -> cart, else keep browsing (scroll to top)
    if (subtotal >= FREE_SHIPPING_THRESHOLD) {
      window.location.href = "/cart";
    } else {
      // Scroll to top so product filters / top products visible
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

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
          {productsToShow.map((p) => (
            <ShopProductCard key={p._id ?? p.slug ?? p.id} product={p} />
          ))}
        </div>
      )}

      {/* Banner: hide if dismissed */}
      {!dismissed && (
        <div style={bannerWrap} role="status" aria-live="polite" aria-atomic="true">
          <div style={bannerStyle}>
            <div style={leftStyle}>
              <span style={{ fontSize: 16 }} aria-hidden>
                {subtotal >= FREE_SHIPPING_THRESHOLD ? "🎉" : "🚚"}
              </span>

              <div style={leftTextWrap}>
                {subtotal >= FREE_SHIPPING_THRESHOLD ? (
                  <>
                    <div style={mainLineStyle}>Congrats — you are eligible for free shipping</div>
                    <div style={subLineStyle}>Subtotal ₹{Number(subtotal).toFixed(2)}</div>
                  </>
                ) : (
                  <>
                    <div style={mainLineStyle}>Free shipping above ₹{FREE_SHIPPING_THRESHOLD}</div>
                    <div style={subLineStyle}>
                      Subtotal ₹{Number(subtotal).toFixed(2)}{" "}
                      <span style={{ fontWeight: 600, color: "#0a5cff" }}>• Add ₹{remaining.toFixed(2)} more to get free shipping</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div style={rightStyle}>
              <button
                onClick={handleCelebrateOrContinue}
                style={{
                  background: subtotal >= FREE_SHIPPING_THRESHOLD ? "#13a65f" : "#6a0dad",
                  color: "#fff",
                  border: "none",
                  padding: "8px 12px",
                  borderRadius: 8,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
                aria-label={subtotal >= FREE_SHIPPING_THRESHOLD ? "Go to cart" : "Continue shopping"}
              >
                {subtotal >= FREE_SHIPPING_THRESHOLD ? "Celebrate" : "Continue shopping"}
              </button>

              <button
                onClick={handleDismiss}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#333",
                  fontWeight: 700,
                  textDecoration: "underline",
                  cursor: "pointer",
                  padding: "6px 8px",
                }}
                aria-label="Dismiss free shipping message"
              >
                Dismiss ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
