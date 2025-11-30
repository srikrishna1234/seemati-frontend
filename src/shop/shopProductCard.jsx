// src/shop/shopProductCard.jsx
import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";

/**
 * shopProductCard.jsx (replacement)
 * - Displays MRP (struck) + selling price + "You save %" calculation.
 * - Adds View, Wishlist, Explore more buttons in footer.
 * - Adds a simple dynamic zoom-on-hover effect over the product image.
 *
 * Notes:
 * - If you want wishlist to persist, pass onToggleWishlist(product) prop
 *   or integrate with your cart/wishlist context.
 * - Explore more currently links to the same product view; you can change target.
 */

/* ---------- helpers (kept from your robust implementation) ---------- */

function extractUrlFromPossibleObject(obj) {
  if (!obj) return null;
  if (typeof obj === "string") return obj;

  const candidates = [
    "url",
    "src",
    "secure_url",
    "location",
    "path",
    "filePath",
    "file_path",
    "key",
    "filename",
    "publicUrl",
    "public_url",
    "original",
    "file",
    "uri",
  ];

  for (const k of candidates) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }

  try {
    if (obj.fields && obj.fields.file && typeof obj.fields.file.url === "string") return obj.fields.file.url;
    if (obj.file && obj.file.url) return obj.file.url;
    if (obj.attributes && obj.attributes.url) return obj.attributes.url;
  } catch (e) {
    // ignore
  }

  try {
    if (typeof obj.toJSON === "function") {
      const j = obj.toJSON();
      if (typeof j === "string" && j.startsWith("http")) return j;
    }
    const s = obj.toString();
    if (typeof s === "string" && s.startsWith("http")) return s;
  } catch (e) {
    // ignore
  }

  return null;
}

function absoluteifyAndRewrite(urlCandidate) {
  if (!urlCandidate) return null;

  try {
    const parsed = new URL(urlCandidate);
    if (parsed.hostname === "api.seemati.in") {
      parsed.hostname = window.location.hostname || "seemati.in";
    }
    return parsed.toString();
  } catch (e) {
    // not absolute
  }

  if (urlCandidate.startsWith("//")) {
    return `${window.location.protocol}${urlCandidate}`;
  }

  if (urlCandidate.startsWith("/")) {
    return `${window.location.origin}${urlCandidate}`;
  }

  const prefixesToTry = [
    "https://api.seemati.in/uploads/",
    "https://seemati.in/uploads/",
    "https://cdn.seemati.in/",
    "https://api.seemati.in/",
    `${window.location.origin}/uploads/`,
  ];

  for (const p of prefixesToTry) {
    const candidate = `${p}${urlCandidate}`;
    try {
      const parsed = new URL(candidate);
      if (parsed.hostname === "api.seemati.in") {
        parsed.hostname = window.location.hostname || "seemati.in";
      }
      return parsed.toString();
    } catch (e) {
      // ignore invalid
    }
  }

  return null;
}

/* ---------- component ---------- */

export default function ShopProductCard({ product, onClick, onToggleWishlist }) {
  // hooks at top
  const zoomRef = useRef(null);
  const [isWishlist, setIsWishlist] = useState(false);

  if (!product) return null;

  const title = product.title ?? product.name ?? "Untitled product";
  const price = Number(product.price ?? product.mrp ?? 0);
  const mrp = typeof product.mrp !== "undefined" ? Number(product.mrp) : undefined;

  // choose thumbnail
  let rawThumb = product.thumbnail ?? null;
  if (!rawThumb && Array.isArray(product.images) && product.images.length > 0) {
    rawThumb = product.images[0];
  }

  if (rawThumb && typeof rawThumb === "object") {
    // console debug once
    if (!zoomRef.current?.__logged) {
      // eslint-disable-next-line no-console
      console.log("shopProductCard - raw thumbnail object for", product._id || product.slug || title, rawThumb);
      if (!zoomRef.current) zoomRef.current = {};
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

  // Calculate save % safely (digit-by-digit as required)
  let savePercent = null;
  if (typeof mrp === "number" && mrp > 0 && !Number.isNaN(price)) {
    // compute difference
    const diff = mrp - price; // exact subtraction
    const ratio = diff / mrp; // fractional saving
    // percentage to nearest integer:
    savePercent = Math.round(ratio * 100);
  }

  // inline styles kept self-contained
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
  };

  const imageWrapStyle = {
    width: "100%",
    height: 260,
    background: "#fff",
    display: "block",
    overflow: "hidden",
    position: "relative",
  };

  // zoom container styles
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

  const footerStyle = {
    padding: "10px 12px",
    display: "flex",
    gap: 8,
    justifyContent: "center",
    alignItems: "center",
  };

  const viewBtnStyle = {
    display: "inline-block",
    padding: "7px 12px",
    borderRadius: 8,
    background: "#6a0dad",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 700,
    fontSize: 13,
  };

  const smallBtnStyle = {
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
  };

  // handlers
  function handleWishlistClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const next = !isWishlist;
    setIsWishlist(next);
    if (typeof onToggleWishlist === "function") {
      try {
        onToggleWishlist(product, next);
      } catch (err) {
        // ignore
      }
    } else {
      // eslint-disable-next-line no-console
      console.log("Wishlist toggled for", product._id || product.slug || title, "=>", next);
    }
  }

  // dynamic zoom handlers - simple scale + transform-origin based on mouse position
  function handleMouseMove(e) {
    const el = zoomRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100; // 0..100
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    // set transform origin
    const img = el.querySelector("img");
    if (img) {
      img.style.transformOrigin = `${x}% ${y}%`;
    }
  }

  function handleMouseEnter() {
    const el = zoomRef.current;
    if (!el) return;
    const img = el.querySelector("img");
    if (img) {
      img.style.transform = "scale(1.6)"; // gentle zoom
    }
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
            console.error(
              "shopProductCard - image failed to load for",
              product._id || product.slug || title,
              "src=",
              e.currentTarget.src
            );
            const placeholderSrc = placeholder;
            if (e.currentTarget.src !== placeholderSrc) e.currentTarget.src = placeholderSrc;
          }}
        />
      </div>

      <div style={bodyStyle}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#111" }}>{title}</h3>

        <div style={{ marginTop: 6 }}>
          {/* show MRP struck through if present */}
          {typeof mrp === "number" && mrp > 0 && mrp !== price ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 8 }}>
              <div style={{ textDecoration: "line-through", color: "#999", fontSize: 13 }}>₹{mrp.toFixed(2)}</div>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#0a5cff" }}>₹{price.toFixed(2)}</div>
              {savePercent !== null && (
                <div style={{ color: "#0a9b4a", fontWeight: 700, fontSize: 12, background: "#e6fbf0", padding: "4px 8px", borderRadius: 8 }}>
                  You save {savePercent}% 
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontWeight: 800, fontSize: 16, color: "#0a5cff" }}>₹{price.toFixed(2)}</div>
          )}
        </div>
      </div>

      <div style={footerStyle}>
        <Link to={`/product/${idOrSlug}`} style={viewBtnStyle} aria-label={`View ${title}`}>
          View
        </Link>

        <button
          onClick={handleWishlistClick}
          aria-pressed={isWishlist}
          title={isWishlist ? "Remove from wishlist" : "Add to wishlist"}
          style={smallBtnStyle}
        >
          {/* simple heart icon (unicode) */}
          <span style={{ color: isWishlist ? "#e53935" : "#111", fontSize: 16 }}>{isWishlist ? "♥" : "♡"}</span>
          <span style={{ fontWeight: 700 }}>{isWishlist ? "Saved" : "Wishlist"}</span>
        </button>

        <Link to={`/product/${idOrSlug}`} style={smallBtnStyle} title="Explore more">
          <span style={{ fontSize: 14 }}>🔍</span>
          <span style={{ fontWeight: 700 }}>Explore</span>
        </Link>
      </div>
    </article>
  );
}
