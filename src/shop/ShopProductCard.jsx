// src/shop/ShopProductCard.jsx
import React from "react";
import { Link } from "react-router-dom";

/**
 * Helper: resolve an image value (string or object) to an absolute URL.
 * Mirrors logic used elsewhere so we are consistent.
 */
function resolveImage(i) {
  const apiBase =
    process.env.REACT_APP_API_BASE_URL ||
    process.env.REACT_APP_API_URL ||
    "https://seemati-backend.onrender.com";

  if (!i) return null;

  // string case
  if (typeof i === "string") {
    const s = i.trim();
    if (!s) return null;
    if (/^https?:\/\//i.test(s)) {
      // rewrite localhost host to apiBase
      if (/https?:\/\/(localhost|127\.0\.0\.1)/i.test(s)) {
        return s.replace(/^https?:\/\/[^/]+/i, apiBase);
      }
      return s;
    }
    if (s.startsWith("//")) {
      return window.location.protocol + s;
    }
    // relative path or bare filename
    if (s.startsWith("/")) return `${apiBase}${s}`;
    return `${apiBase}/uploads/${s}`;
  }

  // object case: { url, filename, path }
  if (typeof i === "object") {
    const u = i.url || i.path || i.filename || i.file || null;
    if (!u) return null;
    return resolveImage(String(u));
  }

  return null;
}

/**
 * Normalize product to ensure we can render the thumbnail easily.
 * Returns an object { src, alt } where src may be null (use placeholder).
 */
function getCardImage(product) {
  if (!product) return { src: null, alt: "" };

  // Priority: thumbnail -> image -> images[0] -> images[0].url -> fallback
  const candidates = [];

  if (product.thumbnail) candidates.push(product.thumbnail);
  if (product.image) candidates.push(product.image);
  if (product.imageUrl) candidates.push(product.imageUrl);
  if (product.images && Array.isArray(product.images)) {
    // push each element in images
    for (const it of product.images) {
      if (!it) continue;
      // if image item is a string, push string
      if (typeof it === "string") candidates.push(it);
      else if (it.url) candidates.push(it.url);
      else if (it.filename) candidates.push(it.filename);
      else if (it.path) candidates.push(it.path);
    }
  }

  // also handle older fields
  if (product.file) candidates.push(product.file);
  if (product.img) candidates.push(product.img);

  // resolve the first valid candidate
  for (const c of candidates) {
    const src = resolveImage(c);
    if (src) return { src, alt: product.title || product.name || "" };
  }

  return { src: null, alt: product.title || product.name || "" };
}

const PLACEHOLDER = "/images/placeholder.png";

/**
 * ShopProductCard: safe, minimal card used in grid views.
 * Keeps markup light and uses the normalized src from getCardImage.
 */
export default function ShopProductCard({ product }) {
  const { src, alt } = getCardImage(product);

  const imageSrc = src || PLACEHOLDER;

  return (
    <div
      style={{
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid #f3f4f6",
        background: "#fff",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ minHeight: 180, display: "flex", alignItems: "center", justifyContent: "center", background: "#fafafa" }}>
        <img
          src={imageSrc}
          alt={alt}
          style={{ maxWidth: "100%", maxHeight: 180, objectFit: "contain", display: "block" }}
          onError={(e) => {
            try {
              if (e && e.target) e.target.src = PLACEHOLDER;
            } catch (err) {}
          }}
        />
      </div>

      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{product.title || product.name || "Untitled"}</div>
        {product.description ? <div style={{ color: "#6b7280", fontSize: 13 }}>{String(product.description).slice(0, 80)}</div> : null}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280", textDecoration: product.mrp > product.price ? "line-through" : "none" }}>
              MRP ₹{(Number(product.mrp ?? product.compareAtPrice ?? product.price ?? 0)).toFixed(2)}
            </div>
            <div style={{ fontWeight: 800, color: "#0b5cff" }}>₹{(Number(product.price ?? 0)).toFixed(2)}</div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <Link to={`/product/${product.slug || product._id || product.id}`} style={{ textDecoration: "none" }}>
              <button style={{ padding: "8px 12px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
                View
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
