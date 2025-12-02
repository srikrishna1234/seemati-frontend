// src/shop/shopProductCard.jsx
import React from "react";
import { Link } from "react-router-dom";

/**
 * Robust ShopProductCard
 * - Safely extracts image URL from different product shapes.
 * - Provides sensible fallbacks.
 * - Avoids rendering [object Object] as image src.
 */

function extractImageUrl(product) {
  const pickFromObject = (obj) => {
    if (!obj) return null;
    if (typeof obj === "string") return obj;
    if (typeof obj === "object") {
      // try common keys
      return obj.url || obj.src || obj.path || obj.filename || obj.secure_url || obj.location || null;
    }
    return null;
  };

  if (!product) return null;

  let url = pickFromObject(product.image) || pickFromObject(product.thumbnail) || pickFromObject(product.thumb);

  if (!url && Array.isArray(product.images) && product.images.length > 0) {
    for (const it of product.images) {
      const u = pickFromObject(it);
      if (u) {
        url = u;
        break;
      }
    }
  }

  if (!url && product.media) {
    url = pickFromObject(product.media) || (Array.isArray(product.media) && pickFromObject(product.media[0]));
  }

  if (!url && product.imageObject && typeof product.imageObject === "object") {
    url = pickFromObject(product.imageObject);
  }

  if (typeof url === "string") {
    if (url.trim().startsWith("[object")) return null;
    return url;
  }

  return null;
}

export default function ShopProductCard({ product }) {
  if (!product) return null;

  const title = product.title || product.name || product.productName || product.slug || "Untitled product";
  const price =
    product.price ||
    (product.variants && product.variants[0] && (product.variants[0].price || product.variants[0].mrp)) ||
    (product.prices && product.prices[0]) ||
    null;

  const rawImage = extractImageUrl(product);

  // If rawImage is a relative path without leading slash, normalize it to start with '/'
  const imgSrc = rawImage
    ? rawImage.startsWith("http") || rawImage.startsWith("/") // good
      ? rawImage
      : `/${rawImage}`
    : "/images/product-placeholder.png"; // fallback placeholder (ensure this exists in /public/images or change path)

  const slug = (product.slug && typeof product.slug === "string" && product.slug) || product._id || product.id || "";

  return (
    <article
      style={{
        borderRadius: 10,
        background: "#fff",
        padding: 12,
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <Link to={slug ? `/product/${slug}` : "#"} style={{ textDecoration: "none", color: "inherit" }}>
        <div style={{ width: "100%", paddingTop: "100%", position: "relative", overflow: "hidden", borderRadius: 8 }}>
          <img
            src={imgSrc}
            alt={title}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src =
                "data:image/svg+xml;charset=UTF-8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><rect width='100%' height='100%' fill='%23fafafa'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='18' fill='%23ccc'>No image</text></svg>";
            }}
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
          <div style={{ fontSize: 13, color: "#666", marginTop: 6 }}>{price ? `₹ ${price}` : "Price not set"}</div>
        </div>
      </Link>
    </article>
  );
}
