// src/shop/shopProductCard.jsx
import React, { useRef } from "react";

/**
 * shopProductCard.jsx
 * - Handles thumbnail as string OR object (common shapes from different backends)
 * - Tries multiple fields inside an object: url, src, location, path, key, publicUrl, filename
 * - Rewrites api.seemati.in -> current host if needed (keeps protocol)
 * - Logs raw thumbnail object once per product for debugging
 */

function extractUrlFromPossibleObject(obj) {
  if (!obj) return null;
  if (typeof obj === "string") return obj;

  // obj might be something like { url: "..."} or { src: "..." } or AWS S3 { key: "..."} or { location: "..." }
  const candidates = [
    "url",
    "src",
    "location",
    "path",
    "key",
    "publicUrl",
    "public_url",
    "filename",
    "file",
    "secure_url",
    "original",
  ];

  for (const k of candidates) {
    const v = obj[k];
    if (typeof v === "string" && v.length) return v;
  }

  // sometimes object is nested: { fields: { file: { url: "..." } } } -- try a couple deeper common patterns
  try {
    if (obj.fields && obj.fields.file && typeof obj.fields.file.url === "string") return obj.fields.file.url;
    if (obj.file && obj.file.url) return obj.file.url;
  } catch (e) {
    // ignore
  }

  // As a last attempt, if object has toString that returns a meaningful url
  try {
    const s = obj.toString();
    if (typeof s === "string" && s.startsWith("http")) return s;
  } catch (e) {
    // ignore
  }

  return null;
}

export default function ShopProductCard({ product, onClick }) {
  if (!product) return null;

  const loggedRef = useRef(false); // ensure we log raw object once per mount
  const title = product.title ?? product.name ?? "Untitled product";
  const price = product.price ?? product.mrp ?? 0;

  // candidate from product.thumbnail (string or object) OR first item in product.images (string or object)
  let rawThumb = product.thumbnail ?? null;
  if (!rawThumb && Array.isArray(product.images) && product.images.length > 0) {
    rawThumb = product.images[0];
  }

  // debug log rawThumb object once
  if (rawThumb && typeof rawThumb === "object" && !loggedRef.current) {
    // eslint-disable-next-line no-console
    console.log("shopProductCard - raw thumbnail object for", product._id || product.slug || title, rawThumb);
    loggedRef.current = true;
  }

  // extract string url if rawThumb is an object
  let thumbnailStr = extractUrlFromPossibleObject(rawThumb);

  // If still no string, it's possible images are stored as { url: { ... } } or similar - fallback to JSON-stringify as last resort (but likely invalid)
  if (!thumbnailStr && typeof rawThumb === "object") {
    thumbnailStr = null; // don't use JSON string as URL
  }

  // If thumbnailStr is relative (starts with '/'), convert to absolute with current host & protocol
  if (thumbnailStr && thumbnailStr.startsWith("/")) {
    try {
      const u = new URL(window.location.origin);
      thumbnailStr = `${u.origin}${thumbnailStr}`;
    } catch (e) {
      // ignore
    }
  }

  // If the image URL refers to api.seemati.in, rewrite hostname to current host to avoid CSP issues (keeps protocol)
  if (thumbnailStr) {
    try {
      const parsed = new URL(thumbnailStr);
      if (parsed.hostname === "api.seemati.in") {
        parsed.hostname = window.location.hostname || "seemati.in";
        // keep protocol as-is (usually https:)
        thumbnailStr = parsed.toString();
      }
    } catch (e) {
      // not a valid absolute URL, ignore
    }
  }

  const placeholder =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'><rect width='100%' height='100%' fill='%23f4f4f4'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23888' font-family='Arial' font-size='18'>No Image</text></svg>`
    );

  const imgSrc = thumbnailStr || placeholder;

  // debug: log final src to console
  // eslint-disable-next-line no-console
  console.log("shopProductCard - final image src for", product._id || product.slug || title, "=>", imgSrc);

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
    alignItems: "stretch"
  };

  const imageWrapStyle = {
    width: "100%",
    height: 220,
    background: "#000",
    display: "block",
    overflow: "hidden"
  };

  const imgStyle = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block"
  };

  const bodyStyle = {
    padding: "10px 12px",
    textAlign: "center"
  };

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
            // log real failing src
            // eslint-disable-next-line no-console
            console.error("shopProductCard - image failed to load for", product._id || product.slug || title, "src=", e.currentTarget.src);
            const placeholderSrc = placeholder;
            if (e.currentTarget.src !== placeholderSrc) e.currentTarget.src = placeholderSrc;
          }}
        />
      </div>

      <div style={bodyStyle}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#111" }}>{title}</h3>
        <div style={{ marginTop: 6, fontWeight: 700 }}>₹{price}</div>
      </div>
    </article>
  );
}
