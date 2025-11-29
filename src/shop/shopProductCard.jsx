// src/shop/shopProductCard.jsx
import React, { useRef } from "react";

/**
 * shopProductCard.jsx (final robust version)
 * - Extracts URL from many possible thumbnail/image shapes
 * - Tries several fallback prefix patterns for keys/paths
 * - Rewrites api.seemati.in to current host to avoid CSP conflicts
 * - Logs the raw thumbnail object once per product and the final URL tried
 */

function extractUrlFromPossibleObject(obj) {
  if (!obj) return null;
  if (typeof obj === "string") return obj;

  // Common candidate fields
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

  // nested common shapes
  try {
    if (obj.fields && obj.fields.file && typeof obj.fields.file.url === "string") return obj.fields.file.url;
    if (obj.file && obj.file.url) return obj.file.url;
    if (obj.attributes && obj.attributes.url) return obj.attributes.url;
  } catch (e) {
    // ignore
  }

  // If object has a toJSON or toString that returns a URL
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

  // If already absolute http/https, keep it (but rewrite host if needed)
  try {
    const parsed = new URL(urlCandidate);
    // rewrite api host to current host to avoid CSP issues
    if (parsed.hostname === "api.seemati.in") {
      parsed.hostname = window.location.hostname || "seemati.in";
    }
    return parsed.toString();
  } catch (e) {
    // not an absolute URL
  }

  // If candidate starts with '//' protocol-relative, prefix protocol
  if (urlCandidate.startsWith("//")) {
    return `${window.location.protocol}${urlCandidate}`;
  }

  // If candidate is relative like "/uploads/..." make absolute
  if (urlCandidate.startsWith("/")) {
    return `${window.location.origin}${urlCandidate}`;
  }

  // If it's likely a key or filename (no slashes or small path), try common upload prefixes
  const prefixesToTry = [
    // primary API uploads path (likely)
    "https://api.seemati.in/uploads/",
    // public site uploads path
    "https://seemati.in/uploads/",
    // fallback cdn (example)
    "https://cdn.seemati.in/",
    // a direct path on api host
    "https://api.seemati.in/",
    // fallback to current origin + /uploads/
    `${window.location.origin}/uploads/`,
  ];

  for (const p of prefixesToTry) {
    const candidate = `${p}${urlCandidate}`;
    try {
      const parsed = new URL(candidate);
      // if we used api.seemati.in, rewrite to current host for CSP
      if (parsed.hostname === "api.seemati.in") {
        parsed.hostname = window.location.hostname || "seemati.in";
      }
      return parsed.toString();
    } catch (e) {
      // ignore invalid URL
    }
  }

  return null;
}

export default function ShopProductCard({ product, onClick }) {
  if (!product) return null;
  const loggedRef = useRef(false);

  const title = product.title ?? product.name ?? "Untitled product";
  const price = product.price ?? product.mrp ?? 0;

  // pick raw thumbnail candidate
  let rawThumb = product.thumbnail ?? null;
  if (!rawThumb && Array.isArray(product.images) && product.images.length > 0) rawThumb = product.images[0];

  // Log the raw thumbnail object once per mount if it's an object (helps me see exact shape)
  if (rawThumb && typeof rawThumb === "object" && !loggedRef.current) {
    // eslint-disable-next-line no-console
    console.log("shopProductCard - raw thumbnail object for", product._id || product.slug || title, rawThumb);
    loggedRef.current = true;
  }

  // extract possible url string
  let extracted = extractUrlFromPossibleObject(rawThumb);
  // if extraction failed but rawThumb is string-like with embedded object, ignore it (avoid [object Object])
  if (extracted && typeof extracted === "string" && extracted.includes("[object")) extracted = null;

  // final absoluteify & rewrite
  let finalUrl = absoluteifyAndRewrite(extracted);

  // if still null and rawThumb itself is string, try direct absoluteify
  if (!finalUrl && typeof rawThumb === "string") {
    finalUrl = absoluteifyAndRewrite(rawThumb);
  }

  // fallback placeholder
  const placeholder =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'><rect width='100%' height='100%' fill='%23f4f4f4'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23888' font-family='Arial' font-size='18'>No Image</text></svg>`
    );

  const imgSrc = finalUrl || placeholder;

  // log final url attempted
  // eslint-disable-next-line no-console
  console.log("shopProductCard - final image src for", product._id || product.slug || title, "=>", imgSrc);

  // styles (constrained sizes)
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
