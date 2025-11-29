// src/shop/shopProductCard.jsx
import React from "react";

/**
 * shopProductCard.jsx
 * - constrained widths and heights to avoid giant images
 * - image uses object-fit: cover
 * - centers content
 */

export default function ShopProductCard({ product, onClick }) {
  if (!product) return null;

  const title = product.title ?? product.name ?? "Untitled product";
  const price = product.price ?? product.mrp ?? 0;

  // Prefer thumbnail then images[0]
  const thumbnail = product.thumbnail || (Array.isArray(product.images) && product.images[0]) || null;
  const placeholder =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'><rect width='100%' height='100%' fill='%23f4f4f4'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23888' font-family='Arial' font-size='18'>No Image</text></svg>`
    );

  const imgSrc = thumbnail || placeholder;

  // Card constraints
  const cardStyle = {
    width: "100%",
    maxWidth: 260, // keep cards narrow
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
    height: 220, // fixed visible height so huge images do not expand the page
    background: "#eee",
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
