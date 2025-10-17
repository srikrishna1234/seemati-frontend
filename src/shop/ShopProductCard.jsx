// src/shop/ShopProductCard.jsx
import React, { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getImageUrl } from "../utils/imageUtils";
import { addOrIncrementItem, loadCart, computeTotals, SHIPPING_THRESHOLD } from "../utils/cartHelpers";
import { useCartDispatch } from "../context/CartContext";

/* ---------- wishlist helpers ---------- */
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
  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(arr));
    // notify listeners (Navbar listens for this)
    try { window.dispatchEvent(new Event("wishlist-updated")); } catch (e) {}
  } catch (e) {
    console.warn("saveWishlist failed", e);
  }
}

/* ---------- burst animation ---------- */
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

/* single-run burst helper (prevents multiple bursts while above threshold) */
function checkAndTriggerBurst(subtotal, containerEl) {
  try {
    const KEY = "seemati_free_burst_done_v1";
    const done = localStorage.getItem(KEY) === "1";
    if (subtotal >= SHIPPING_THRESHOLD && !done) {
      burstAt(containerEl || document.body, { count: 30, spread: 220, lifetime: 1000 });
      localStorage.setItem(KEY, "1");
    } else if (subtotal < SHIPPING_THRESHOLD && done) {
      localStorage.removeItem(KEY);
    }
  } catch (e) {
    // swallow
    console.warn("burst check failed", e);
  }
}

/* Image zoom */
function useImageZoom() {
  const imgRef = useRef(null);
  function onImgMouseMove(e) {
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const px = (x / rect.width) * 100;
    const py = (y / rect.height) * 100;
    img.style.transformOrigin = `${px}% ${py}%`;
  }
  function onImgEnter() {
    const img = imgRef.current;
    if (!img) return;
    img.style.transition = "transform 160ms cubic-bezier(.2,.9,.2,1)";
    img.style.transform = "scale(1.22)";
    img.style.willChange = "transform";
  }
  function onImgLeave() {
    const img = imgRef.current;
    if (!img) return;
    img.style.transform = "scale(1)";
    img.style.transition = "transform 260ms cubic-bezier(.2,.9,.2,1)";
    setTimeout(() => { if (img) img.style.willChange = ""; }, 300);
  }
  return { imgRef, onImgMouseMove, onImgEnter, onImgLeave };
}

const fmt = (v) => {
  const n = Number(v ?? 0);
  return `₹${n.toFixed(2)}`;
};

export default function ShopProductCard({ product }) {
  const idOrSlug = product?.slug || product?._id || "";
  const title = product?.title || "Product";
  const price = Number(product?.price ?? product?.salePrice ?? 0);
  const mrp = Number(product?.mrp ?? product?.compareAtPrice ?? product?.originalPrice ?? price);
  const saveAmt = Math.max(0, mrp - price);
  const savePct = mrp > 0 ? Math.round((saveAmt / mrp) * 100) : 0;
  const desc = product?.description ?? "";

  const thumbField =
    product?.thumbnail ||
    (product?.images && product.images[0] && (product.images[0].url || product.images[0])) ||
    product?.image ||
    null;

  const src = thumbField
    ? typeof thumbField === "string"
      ? getImageUrl({ url: thumbField, size: 800 })
      : getImageUrl({ url: thumbField.url || thumbField, size: 800 })
    : `${process.env.REACT_APP_API_URL || "http://localhost:4000"}/uploads/placeholder.png`;

  const { imgRef, onImgMouseMove, onImgEnter, onImgLeave } = useImageZoom();
  const cardRef = useRef(null);
  const [adding, setAdding] = useState(false);

  // context dispatch hook so we update CartContext immediately
  const cartDispatch = useCartDispatch();

  // wishlist local state
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const arr = loadWishlist();
      const pid = product?._id ?? product?.id ?? product?.slug;
      setSaved(arr.some(i => (i.productId ?? i._id ?? i.id ?? i.slug) === pid));
    } catch {
      setSaved(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?._id, product?.id, product?.slug]);

  function toggleWishlist(e) {
    e?.preventDefault?.();
    const pid = product?._id ?? product?.id ?? product?.slug ?? null;
    if (!pid) return;
    const arr = loadWishlist();
    const exists = arr.find(i => (i.productId ?? i._id ?? i.id ?? i.slug) === pid);
    let next;
    if (exists) {
      next = arr.filter(i => (i.productId ?? i._id ?? i.id ?? i.slug) !== pid);
      saveWishlist(next);
      setSaved(false);
    } else {
      const payload = {
        productId: pid,
        _id: product._id ?? pid,
        id: product.id ?? pid,
        slug: product.slug ?? undefined,
        title: product.title,
        price: Number(product.price ?? 0),
        image: product.image ?? (product.images && product.images[0] && (product.images[0].url || product.images[0])) ?? null
      };
      next = [...arr, payload];
      saveWishlist(next);
      setSaved(true);
    }
  }

  async function handleAdd(e) {
    e && e.preventDefault && e.preventDefault();
    setAdding(true);
    const itemPayload = {
      _id: product._id ?? product.id ?? product.slug ?? Math.random().toString(36).slice(2, 9),
      productId: product._id ?? product.id ?? product.slug ?? Math.random().toString(36).slice(2, 9),
      slug: product.slug,
      title: product.title,
      price: Number(product.price ?? 0),
      images: product.images ?? (product.image ? [{ url: product.image }] : []),
      image: product.imageUrl ?? (product.images && product.images[0] ? product.images[0].url : null),
      quantity: 1,
    };

    try {
      // update localStorage-backed helpers (existing behavior)
      const saved = await addOrIncrementItem(itemPayload, 1);

      // sync context to authoritative saved cart (prevents double-increment)
      try {
        if (typeof cartDispatch === "function") {
          cartDispatch({ type: "INITIALIZE", payload: saved });
        }
      } catch (err) {
        console.warn("[ShopProductCard] context dispatch failed:", err);
      }

      // notify listeners
      try { window.dispatchEvent(new Event("cart-updated")); } catch (e) {}

      // do burst only when crossing threshold (once)
      try {
        const comp = computeTotals(saved);
        checkAndTriggerBurst(comp.subtotal || 0, cardRef.current || document.body);
      } catch (e) {}

    } catch (err) {
      // older fallback event used in your app
      window.dispatchEvent(new CustomEvent("seemati:add-to-cart", { detail: { product } }));
    }

    setAdding(false);
  }

  // expose checkAndTriggerBurst (reused above)
  function checkAndTriggerBurst(subtotal, containerEl) {
    try {
      const KEY = "seemati_free_burst_done_v1";
      const done = localStorage.getItem(KEY) === "1";
      if (subtotal >= SHIPPING_THRESHOLD && !done) {
        burstAt(containerEl || document.body, { count: 30, spread: 220, lifetime: 1000 });
        localStorage.setItem(KEY, "1");
      } else if (subtotal < SHIPPING_THRESHOLD && done) {
        localStorage.removeItem(KEY);
      }
    } catch (e) {
      console.warn("burst check failed", e);
    }
  }

  return (
    <article
      ref={cardRef}
      className="product-card"
      data-product-id={idOrSlug}
      style={{
        borderRadius: 8,
        overflow: "hidden",
        background: "#fff",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <Link to={idOrSlug ? `/product/${idOrSlug}` : "#"} style={{ color: "inherit", textDecoration: "none", flex: "1 1 auto" }} aria-label={title}>
        <div
          style={{
            width: "100%",
            height: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#fff",
            borderBottom: "1px solid #f3f3f3",
            overflow: "hidden",
          }}
        >
          <img
            ref={imgRef}
            src={src}
            alt={title}
            loading="lazy"
            onMouseMove={onImgMouseMove}
            onMouseEnter={onImgEnter}
            onMouseLeave={onImgLeave}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              display: "block",
              transition: "transform 180ms cubic-bezier(.2,.9,.2,1)",
              transform: "scale(1)",
            }}
            onError={(e) => {
              e.target.src = `${process.env.REACT_APP_API_URL || "http://localhost:4000"}/uploads/placeholder.png`;
            }}
          />
        </div>

        <div style={{ padding: "10px 12px" }}>
          <h3 style={{ margin: 0, fontSize: 15, lineHeight: 1.2 }}>{title}</h3>
          {desc && <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>{desc}</div>}

          <div style={{ marginTop: 10 }}>
            {mrp > 0 && (
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <div style={{ fontSize: 12, color: "#7c3aed", fontWeight: 700 }}>MRP</div>
                <div style={{ fontSize: 16, color: "#7c3aed", textDecoration: mrp > price ? "line-through" : "none", fontWeight: 700 }}>
                  {fmt(mrp)}
                </div>
              </div>
            )}

            <div style={{ fontSize: 15, marginTop: 6, display: "flex", alignItems: "baseline", gap: 8 }}>
              <div style={{ fontSize: 13, color: "#111827", fontWeight: 700 }}>Offer Price</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#0b5cff" }}>{fmt(price)}</div>
            </div>

            {saveAmt > 0 && (
              <div style={{ marginTop: 6, color: "#059669", fontWeight: 700, fontSize: 13 }}>
                You save {fmt(saveAmt)} ({savePct}%)
              </div>
            )}
          </div>
        </div>
      </Link>

      <div style={{ padding: 12, display: "flex", gap: 8 }}>
        <button
          onClick={handleAdd}
          disabled={adding}
          style={{
            background: "#f59e0b",
            color: "#fff",
            border: "none",
            padding: "8px 12px",
            borderRadius: 6,
            fontWeight: 700,
            cursor: adding ? "progress" : "pointer",
          }}
        >
          {adding ? "Adding..." : "Add"}
        </button>

        <button
          onClick={toggleWishlist}
          title={saved ? "Saved to wishlist" : "Save for later"}
          aria-pressed={saved}
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            border: saved ? "1px solid #ef4444" : "1px solid #e6e6e6",
            background: saved ? "#fff0f0" : "#fff",
            color: saved ? "#ef4444" : "#111",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          {saved ? "♥ Saved" : "♡ Save"}
        </button>

        <Link to={idOrSlug ? `/product/${idOrSlug}` : "#"} style={{ marginLeft: "auto" }}>
          <button
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid #e6e6e6",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            View
          </button>
        </Link>
      </div>
    </article>
  );
}
