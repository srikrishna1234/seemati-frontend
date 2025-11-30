// src/shop/shopProductCard.jsx
import React, { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";

/**
 * shopProductCard.jsx (updated)
 * - Slightly lifts the image (reduced gap) so visual center sits higher.
 * - Wishlist persistence via localStorage and firing window 'wishlistUpdated' event.
 * - Keeps View centered and actions below. Defensive and self-contained.
 */

/* ---------- helpers (kept robust) ---------- */

function extractUrlFromPossibleObject(obj) {
  if (!obj) return null;
  if (typeof obj === "string") return obj;

  const candidates = [
    "url","src","secure_url","location","path","filePath","file_path","key","filename","publicUrl","public_url","original","file","uri",
  ];

  for (const k of candidates) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
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
  try {
    const parsed = new URL(urlCandidate);
    if (parsed.hostname === "api.seemati.in") parsed.hostname = window.location.hostname || "seemati.in";
    return parsed.toString();
  } catch (e) {}
  if (urlCandidate.startsWith("//")) return `${window.location.protocol}${urlCandidate}`;
  if (urlCandidate.startsWith("/")) return `${window.location.origin}${urlCandidate}`;
  const prefixesToTry = [
    "https://api.seemati.in/uploads/","https://seemati.in/uploads/","https://cdn.seemati.in/","https://api.seemati.in/",`${window.location.origin}/uploads/`,
  ];
  for (const p of prefixesToTry) {
    const candidate = `${p}${urlCandidate}`;
    try {
      const parsed = new URL(candidate);
      if (parsed.hostname === "api.seemati.in") parsed.hostname = window.location.hostname || "seemati.in";
      return parsed.toString();
    } catch (e) {}
  }
  return null;
}

/* ---------- wishlist helpers ---------- */

function readWishlistFromStorage() {
  try {
    const raw = localStorage.getItem("wishlist");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch (e) {
    return [];
  }
}

function saveWishlistToStorage(arr) {
  try {
    localStorage.setItem("wishlist", JSON.stringify(arr));
    // dispatch event for other parts of the app (header) to update counts
    const ev = new CustomEvent("wishlistUpdated", { detail: { count: arr.length } });
    window.dispatchEvent(ev);
  } catch (e) {
    // ignore
  }
}

/* ---------- component ---------- */

export default function ShopProductCard({ product, onClick, onToggleWishlist }) {
  const zoomRef = useRef(null);
  const [isWishlist, setIsWishlist] = useState(false);

  useEffect(() => {
    const list = readWishlistFromStorage();
    const id = (product && (product._id ?? product.id ?? product.slug)) ?? null;
    if (!id) return;
    setIsWishlist(list.includes(String(id)));
  }, [product]);

  if (!product) return null;

  const title = product.title ?? product.name ?? "Untitled product";
  const price = Number(product.price ?? product.mrp ?? 0);
  const mrp = typeof product.mrp !== "undefined" ? Number(product.mrp) : undefined;

  // image pick
  let rawThumb = product.thumbnail ?? null;
  if (!rawThumb && Array.isArray(product.images) && product.images.length > 0) rawThumb = product.images[0];

  if (rawThumb && typeof rawThumb === "object") {
    if (!zoomRef.current?.__logged) {
      // eslint-disable-next-line no-console
      console.log("shopProductCard - raw thumbnail object for", product._id || product.slug || title, rawThumb);
      zoomRef.current = zoomRef.current || {};
      zoomRef.current.__logged = true;
    }
  }

  let extracted = extractUrlFromPossibleObject(rawThumb);
  if (extracted && typeof extracted === "string" && extracted.includes("[object")) extracted = null;
  let finalUrl = absoluteifyAndRewrite(extracted);
  if (!finalUrl && typeof rawThumb === "string") finalUrl = absoluteifyAndRewrite(rawThumb);

  const placeholder =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'><rect width='100%' height='100%' fill='%23f4f4f4'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23888' font-family='Arial' font-size='18'>No Image</text></svg>`
    );

  const imgSrc = finalUrl || placeholder;

  // save % and rupee saving
  let savePercent = null;
  let saveRupees = null;
  if (typeof mrp === "number" && mrp > 0 && !Number.isNaN(price)) {
    const diff = mrp - price;
    const ratio = diff / mrp;
    savePercent = Math.round(ratio * 100);
    saveRupees = Math.max(0, diff);
  }

  /* ---------- inline styles (small lift & spacing) ---------- */
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
    marginBottom: 18, // ensure small spacing
  };

  // reduce image container vertical space so the image sits slightly higher
  const imageWrapStyle = {
    width: "100%",
    height: 240, // slightly reduced from 260 to lift visual
    background: "#fff",
    display: "flex",
    alignItems: "flex-start", // put image a bit higher
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
    transition: "transform 180ms ease-out",
    display: "block",
    willChange: "transform",
  };

  const bodyStyle = {
    padding: "10px 12px",
    textAlign: "center",
  };

  const footerSplitStyle = {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: "10px 12px",
  };

  const viewRowStyle = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  };

  const actionsRowStyle = {
    display: "flex",
    gap: 8,
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
  };

  const viewBtnStyle = {
    minWidth: 84,
    display: "inline-block",
    padding: "8px 14px",
    borderRadius: 10,
    background: "#6a0dad",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 700,
    fontSize: 13,
    textAlign: "center",
  };

  const smallBtnStyle = {
    minWidth: 96,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 8,
    background: "#fff",
    border: "1px solid rgba(0,0,0,0.08)",
    color: "#111",
    fontWeight: 700,
    fontSize: 13,
    textDecoration: "none",
    justifyContent: "center",
  };

  /* ---------- handlers ---------- */

  function handleWishlistClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const id = (product && (product._id ?? product.id ?? product.slug)) ?? null;
    if (!id) return;
    const list = readWishlistFromStorage().map(String);
    const sid = String(id);
    const exists = list.includes(sid);
    let nextList;
    if (exists) {
      nextList = list.filter((x) => x !== sid);
    } else {
      nextList = [sid, ...list];
    }
    saveWishlistToStorage(nextList);
    setIsWishlist(!exists);
    if (typeof onToggleWishlist === "function") {
      try {
        onToggleWishlist(product, !exists);
      } catch (err) {}
    }
  }

  function handleMouseMove(e) {
    const el = zoomRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const img = el.querySelector("img");
    if (img) {
      img.style.transformOrigin = `${x}% ${y}%`;
    }
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
    if (img) {
      img.style.transform = "scale(1)";
      img.style.transformOrigin = "center center";
    }
  }

  const idOrSlug = product.slug || product._id || "";

  return (
    <article
      className="product-card"
      style={cardStyle}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) onClick();
      }}
    >
      <div
        style={imageWrapStyle}
        ref={(r) => (zoomRef.current = r)}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <img
          src={imgSrc}
          alt={title}
          style={zoomImgStyle}
          onError={(e) => {
            // eslint-disable-next-line no-console
            console.error("shopProductCard - image failed to load for", product._id || product.slug || title, "src=", e.currentTarget.src);
            const placeholderSrc = placeholder;
            if (e.currentTarget.src !== placeholderSrc) e.currentTarget.src = placeholderSrc;
          }}
        />
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
          <Link to={`/product/${idOrSlug}`} style={viewBtnStyle} aria-label={`View ${title}`}>
            View
          </Link>
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
