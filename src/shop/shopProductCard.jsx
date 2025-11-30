// src/shop/shopProductCard.jsx
import React, { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";

/**
 * shopProductCard.jsx
 * - All hooks declared after synchronous derivations so the hook order is stable.
 * - Image preloader to avoid flicker.
 * - Wishlist persistence and event dispatch.
 */

/* ---------- helpers ---------- */

function extractUrlFromPossibleObject(obj) {
  if (!obj) return null;
  if (typeof obj === "string") return obj;
  const candidates = [
    "url","src","secure_url","location","path","filePath","file_path","key","filename","publicUrl","public_url","original","file","uri",
  ];
  for (const k of candidates) {
    try {
      const v = obj[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    } catch (e) {}
  }
  try {
    if (obj.fields && obj.fields.file && typeof obj.fields.file.url === "string") return obj.fields.file.url;
    if (obj.file && obj.file.url) return obj.file.url;
    if (obj.attributes && obj.attributes.url) return obj.attributes.url;
  } catch (e) {}
  try {
    if (typeof obj.toJSON === "function") {
      const j = obj.toJSON();
      if (typeof j === "string" && j.startsWith("http")) return j;
    }
    const s = obj.toString();
    if (typeof s === "string" && s.startsWith("http")) return s;
  } catch (e) {}
  return null;
}

function absoluteifyAndRewrite(urlCandidate) {
  if (!urlCandidate) return null;
  const origin = (typeof window !== "undefined" && window.location && window.location.origin) ? window.location.origin : "https://seemati.in";
  try {
    const parsed = new URL(urlCandidate, origin);
    if (parsed.hostname === "api.seemati.in" && typeof window !== "undefined") {
      parsed.hostname = window.location.hostname || parsed.hostname;
    }
    return parsed.toString();
  } catch (e) {}
  if (typeof urlCandidate === "string") {
    if (urlCandidate.startsWith("//")) return `${(typeof window !== "undefined" ? window.location.protocol : "https:")}${urlCandidate}`;
    if (urlCandidate.startsWith("/")) return `${origin}${urlCandidate}`;
  }
  const prefixesToTry = [
    "https://api.seemati.in/uploads/",
    "https://seemati.in/uploads/",
    "https://cdn.seemati.in/",
    "https://api.seemati.in/",
    `${origin}/uploads/`,
  ];
  for (const p of prefixesToTry) {
    try {
      const candidate = `${p}${urlCandidate}`;
      const parsed = new URL(candidate);
      if (parsed.hostname === "api.seemati.in" && typeof window !== "undefined") parsed.hostname = window.location.hostname || parsed.hostname;
      return parsed.toString();
    } catch (e) {}
  }
  return null;
}

/* wishlist storage helpers */
function readWishlistFromStorage() {
  try {
    if (typeof window === "undefined" || !window.localStorage) return [];
    const raw = localStorage.getItem("wishlist");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function saveWishlistToStorage(arr) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    localStorage.setItem("wishlist", JSON.stringify(arr));
    try { window.dispatchEvent(new CustomEvent("wishlistUpdated", { detail: { count: arr.length, ids: arr.slice() } })); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent("seemati:wishlist-updated", { detail: { count: arr.length, ids: arr.slice() } })); } catch (e) {}
  } catch (e) {}
}

/* ---------- component ---------- */

export default function ShopProductCard({ product, onClick, onToggleWishlist }) {
  const zoomRef = useRef(null);

  // --- synchronous derivation: compute everything that hooks might use BEFORE hooks ---
  const productId = product && (product._id ?? product.id ?? product.slug) ? String(product._id ?? product.id ?? product.slug) : null;
  const title = product ? (product.title ?? product.name ?? "Untitled product") : "Untitled product";
  const price = product ? Number(product.price ?? product.mrp ?? 0) : 0;
  const mrp = product ? (typeof product.mrp !== "undefined" ? Number(product.mrp) : undefined) : undefined;

  // pick raw thumb safely
  let rawThumb = product?.thumbnail ?? null;
  if (!rawThumb && Array.isArray(product?.images) && product.images.length > 0) rawThumb = product.images[0];

  // log raw objects once if present
  if (rawThumb && typeof rawThumb === "object" && !zoomRef.current?.__logged) {
    // eslint-disable-next-line no-console
    console.log("shopProductCard - raw thumbnail object for", product?._id || product?.slug || title);
    zoomRef.current = zoomRef.current || {};
    zoomRef.current.__logged = true;
  }

  let extracted = extractUrlFromPossibleObject(rawThumb);
  if (extracted && typeof extracted === "string" && extracted.includes("[object")) extracted = null;
  const finalUrl = absoluteifyAndRewrite(extracted || (typeof rawThumb === "string" ? rawThumb : null));

  const placeholder =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'><rect width='100%' height='100%' fill='%23f4f4f4'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23888' font-family='Arial' font-size='18'>No Image</text></svg>`
    );

  // --- HOOKS: declared after synchronous derivation so their order never changes ---
  const [isWishlist, setIsWishlist] = useState(() => {
    try {
      return productId ? readWishlistFromStorage().map(String).includes(String(productId)) : false;
    } catch (e) { return false; }
  });
  const [imgSrc, setImgSrc] = useState(placeholder);
  const [imgLoaded, setImgLoaded] = useState(false);

  // sync wishlist when productId changes
  useEffect(() => {
    if (!productId) { setIsWishlist(false); return; }
    const list = readWishlistFromStorage();
    setIsWishlist(list.map(String).includes(String(productId)));
  }, [productId]);

  // image preloader: depends on finalUrl
  useEffect(() => {
    let cancelled = false;
    setImgLoaded(false);
    setImgSrc(placeholder);

    if (!finalUrl) {
      setImgLoaded(true);
      return () => { cancelled = true; };
    }

    const img = new Image();
    img.onload = () => {
      if (!cancelled) { setImgSrc(finalUrl); setImgLoaded(true); }
    };
    img.onerror = () => {
      if (!cancelled) { setImgSrc(placeholder); setImgLoaded(true); }
    };
    img.src = finalUrl;

    const t = setTimeout(() => { if (!cancelled && !imgLoaded) setImgSrc(placeholder); }, 2500);
    return () => { cancelled = true; clearTimeout(t); };
  }, [finalUrl]); // safe: finalUrl computed synchronously above

  // EARLY RETURN: allowed now because hooks already declared
  if (!product) return null;

  // compute save % and rupee saving
  let savePercent = null;
  let saveRupees = null;
  if (typeof mrp === "number" && mrp > 0 && !Number.isNaN(price)) {
    const diff = mrp - price;
    const ratio = diff / mrp;
    savePercent = Math.round(ratio * 100);
    saveRupees = Math.max(0, diff);
  }

  /* ---------- inline styles (kept same) ---------- */
  const cardStyle = {
    width: "100%",
    maxWidth: 260,
    borderRadius: 10,
    overflow: "hidden",
    background: "#fff",
    boxShadow: "0 6px 18px rgba(0,0,0,0.04)",
    cursor: onClick ? "pointer" : "default",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    margin: "12px",
    marginBottom: 18,
  };

  const imageWrapStyle = {
    width: "100%",
    height: 240,
    background: "#fff",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    paddingTop: 8,
  };

  const zoomImgStyle = {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    transformOrigin: "center center",
    transition: "transform 180ms ease-out, opacity 180ms ease-out",
    display: "block",
    willChange: "transform, opacity",
    opacity: imgLoaded ? 1 : 0.01,
  };

  const bodyStyle = { padding: "10px 12px", textAlign: "center" };
  const footerSplitStyle = { display: "flex", flexDirection: "column", gap: 10, padding: "10px 12px" };
  const viewRowStyle = { display: "flex", justifyContent: "center", alignItems: "center" };
  const actionsRowStyle = { display: "flex", gap: 8, justifyContent: "center", alignItems: "center", flexWrap: "wrap" };

  const viewBtnStyle = {
    minWidth: 84, display: "inline-block", padding: "8px 14px", borderRadius: 10, background: "#6a0dad", color: "#fff",
    textDecoration: "none", fontWeight: 700, fontSize: 13, textAlign: "center",
  };

  const smallBtnStyle = {
    minWidth: 96, display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8,
    background: "#fff", border: "1px solid rgba(0,0,0,0.08)", color: "#111", fontWeight: 700, fontSize: 13,
    textDecoration: "none", justifyContent: "center",
  };

  /* ---------- handlers ---------- */
  function handleWishlistClick(e) {
    e.preventDefault(); e.stopPropagation();
    const id = (product && (product._id ?? product.id ?? product.slug)) ?? null;
    if (!id) return;
    const list = readWishlistFromStorage().map(String);
    const sid = String(id);
    const exists = list.includes(sid);
    const nextList = exists ? list.filter((x) => x !== sid) : [sid, ...list];
    saveWishlistToStorage(nextList);
    setIsWishlist(!exists);
    if (typeof onToggleWishlist === "function") {
      try { onToggleWishlist(product, !exists); } catch (err) {}
    }
  }

  function handleMouseMove(e) {
    const el = zoomRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const img = el.querySelector("img");
    if (img) img.style.transformOrigin = `${x}% ${y}%`;
  }

  function handleMouseEnter() {
    const el = zoomRef.current;
    if (!el) return;
    const img = el.querySelector("img");
    if (img) img.style.transform = "scale(1.6)";
  }

  function handleMouseLeave() {
    const el = zoomRef.current;
    if (!el) return;
    const img = el.querySelector("img");
    if (img) { img.style.transform = "scale(1)"; img.style.transformOrigin = "center center"; }
  }

  const idOrSlug = product.slug || product._id || "";

  return (
    <article
      className="product-card"
      style={cardStyle}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => { if (onClick && (e.key === "Enter" || e.key === " ")) onClick(); }}
    >
      <div style={imageWrapStyle} ref={(r) => (zoomRef.current = r)} onMouseMove={handleMouseMove} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <img src={imgSrc || placeholder} alt={title} style={zoomImgStyle} onError={(e) => { if (e.currentTarget && e.currentTarget.src !== placeholder) e.currentTarget.src = placeholder; }} />
      </div>

      <div style={bodyStyle}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#111" }}>{title}</h3>

        <div style={{ marginTop: 8 }}>
          {typeof mrp === "number" && mrp > 0 && mrp !== price ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
              <div style={{ color: "#444", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontWeight: 600 }}>MRP:</span>
                <span style={{ textDecoration: "line-through", color: "#555" }}>₹{mrp.toFixed(2)}</span>
              </div>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#0a5cff" }}>₹{price.toFixed(2)}</div>
            </div>
          ) : (
            <div style={{ fontWeight: 800, fontSize: 16, color: "#0a5cff" }}>₹{price.toFixed(2)}</div>
          )}
        </div>

        <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-start" }}>
          {savePercent !== null && (
            <div style={{ color: "#0a9b4a", fontWeight: 700, fontSize: 12, background: "#e6fbf0", padding: "6px 10px", borderRadius: 8 }}>
              <span style={{ marginRight: 8 }}>You save {savePercent}%</span>
              <span style={{ color: "#0a7b4f", fontWeight: 800 }}>• ₹{saveRupees.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      <div style={footerSplitStyle}>
        <div style={viewRowStyle}>
          <Link to={`/product/${idOrSlug}`} style={viewBtnStyle} aria-label={`View ${title}`}>View</Link>
        </div>

        <div style={actionsRowStyle}>
          <button onClick={handleWishlistClick} aria-pressed={isWishlist} title={isWishlist ? "Remove from wishlist" : "Add to wishlist"} style={smallBtnStyle}>
            <span style={{ color: isWishlist ? "#e53935" : "#111", fontSize: 16 }}>{isWishlist ? "♥" : "♡"}</span>
            <span style={{ fontWeight: 700 }}>{isWishlist ? "Saved" : "Wishlist"}</span>
          </button>

          <Link to={`/product/${idOrSlug}`} style={smallBtnStyle} title="Explore more">
            <span style={{ fontSize: 14 }}>🔍</span>
            <span style={{ fontWeight: 700 }}>Explore</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
