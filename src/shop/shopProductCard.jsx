// src/shop/shopProductCard.jsx
import React from "react";

/**
 * shopProductCard
 * - Filename intentionally lowercase 's' to match your filesystem.
 * - Uses thumbnail first, then images[0], then a lightweight SVG placeholder.
 */

export default function ShopProductCard({ product, onClick }) {
  if (!product) return null;

  const title = product.title ?? product.name ?? "Untitled product";
  const price = product.price ?? product.mrp ?? 0;
  const slug = product.slug ?? product._id ?? "";

  const thumbnail = product.thumbnail || (Array.isArray(product.images) && product.images[0]) || null;
  const placeholder =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect width='100%' height='100%' fill='%23f3f3f3'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23888' font-family='Arial' font-size='18'>No Image</text></svg>`
    );

  const imgSrc = thumbnail || placeholder;

  return (
    <article
      className="product-card p-2 bg-white rounded shadow-sm"
      style={{ cursor: onClick ? "pointer" : "default" }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) onClick();
      }}
    >
      <div style={{ width: "100%", aspectRatio: "4/3", overflow: "hidden", borderRadius: 6 }}>
        <img
          src={imgSrc}
          alt={title}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onError={(e) => {
            if (e.currentTarget.src !== placeholder) e.currentTarget.src = placeholder;
          }}
        />
      </div>

      <div style={{ marginTop: 8, textAlign: "center" }}>
        <h3 style={{ fontSize: 14, margin: "0 0 4px", color: "#111" }}>{title}</h3>
        <div style={{ fontWeight: 700 }}>₹{price}</div>
      </div>
    </article>
  );
}
