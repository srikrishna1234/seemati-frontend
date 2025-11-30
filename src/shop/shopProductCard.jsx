// src/shop/shopProductCard.jsx
import React, { useRef } from "react";
import { Link } from "react-router-dom";

/**
 * shopProductCard.jsx (replacement)
 * - Preserves robust image extraction and rewriting logic.
 * - Restores a visible "View" button that links to /product/:slug (or /product/:id fallback).
 * - Keeps hooks (useRef) called unconditionally at the top to satisfy rules-of-hooks.
 */

/* ---------- helpers (unchanged / improved) ---------- */

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

export default function ShopProductCard({ product, onClick }) {
  // keep hook called unconditionally
  const loggedRef = useRef(false);

  if (!product) return null;

  const title = product.title ?? product.name ?? "Untitled product";
  const price = product.price ?? product.mrp ?? 0;

  // pick thumbnail candidate
  let rawThumb = product.thumbnail ?? null;
  if (!rawThumb && Array.isArray(product.images) && product.images.length > 0) {
    rawThumb = product.images[0];
  }

  // debug log raw object once
  if (rawThumb && typeof rawThumb === "object" && !loggedRef.current) {
    // eslint-disable-next-line no-console
    console.log("shopProductCard - raw thumbnail object for", product._id || product.slug || title, rawThumb);
    loggedRef.current = true;
  }

  // extract and finalize URL
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

  // debug final url
  // eslint-disable-next-line no-console
  console.log("shopProductCard - final image src for", product._id || product.slug || title, "=>", imgSrc);

  // inline styles (kept simple to avoid external css dependency)
  const cardStyle = {
    width: "100%",
    maxWidth: 260,
    borderRadius: 8,
    overflow: "hidden",
    background: "#fff",
    boxShadow: "0 0 0 1px rgba(0,0,0,0.03)",
    cursor: onClick ? "pointer" : "default",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
  };

  const imageWrapStyle = {
    width: "100%",
    height: 220,
    background: "#fff",
    display: "block",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const imgStyle = {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    display: "block",
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
    padding: "6px 12px",
    borderRadius: 8,
    background: "#6a0dad",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 700,
    fontSize: 13,
  };

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
      <div style={imageWrapStyle}>
        <img
          src={imgSrc}
          alt={title}
          style={imgStyle}
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
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#111" }}>{title}</h3>
        <div style={{ marginTop: 6, fontWeight: 700 }}>₹{price}</div>
      </div>

      {/* footer with View button (restored) */}
      <div style={footerStyle}>
        <Link to={`/product/${idOrSlug}`} style={viewBtnStyle} aria-label={`View ${title}`}>
          View
        </Link>
      </div>
    </article>
  );
}
