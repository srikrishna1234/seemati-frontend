// src/components/ProductPrice.jsx
import React from "react";

/**
 * ProductPrice
 * Props:
 *  - price (number)
 *  - mrp (number | null)
 *  - compact (bool) -> renders smaller inline layout suitable for product cards
 *
 * Usage:
 *  <ProductPrice mrp={mrp} price={price} compact />
 *  <ProductPrice mrp={mrp} price={price} />
 */

function fmtIN(n) {
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-IN");
}

export default function ProductPrice({ price = 0, mrp = null, compact = false }) {
  const priceNum = typeof price === "string" ? Number(price) : price;
  const mrpNum = typeof mrp === "string" ? Number(mrp) : mrp;

  const hasValidPrice = Number.isFinite(priceNum) && priceNum > 0;
  const hasValidMrp = Number.isFinite(mrpNum) && mrpNum > 0 && mrpNum > priceNum;

  const youSave = hasValidMrp && hasValidPrice ? Math.max(0, mrpNum - priceNum) : null;
  const discountPercent =
    hasValidMrp && hasValidPrice ? Math.round(((mrpNum - priceNum) / mrpNum) * 100) : null;

  if (compact) {
    // compact inline layout for product cards
    return (
      <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
        <div style={{ fontSize: 12, color: "#6b7280", textDecoration: hasValidMrp ? "line-through" : "none" }}>
          {hasValidMrp ? `₹${fmtIN(mrpNum)}` : "—"}
        </div>

        <div style={{ fontSize: 16, fontWeight: 700, color: "#166534" }}>
          {hasValidPrice ? `₹${fmtIN(priceNum)}` : "—"}
        </div>

        <div style={{ fontSize: 12, color: youSave !== null ? "#dc2626" : "#6b7280", fontWeight: 600 }}>
          {youSave !== null ? `₹${fmtIN(youSave)}` : ""}
        </div>

        <div style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>
          {discountPercent !== null ? `${discountPercent}%` : ""}
        </div>
      </div>
    );
  }

  // full (larger) layout — fits product detail or product list with room
  return (
    <div style={{ background: "#f8fafc", padding: 12, borderRadius: 6 }}>
      <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>MRP</div>
          <div style={{ fontSize: 14, textDecoration: hasValidMrp ? "line-through" : "none", color: "#6b7280" }}>
            {hasValidMrp ? `₹${fmtIN(mrpNum)}` : "—"}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Our Price</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#166534" }}>
            {hasValidPrice ? `₹${fmtIN(priceNum)}` : "—"}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>You Save</div>
          <div style={{ fontSize: 14, color: youSave !== null ? "#dc2626" : "#6b7280", fontWeight: 600 }}>
            {youSave !== null ? `₹${fmtIN(youSave)}` : "—"}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Discount</div>
          <div style={{ fontSize: 14, color: "#374151", fontWeight: 600 }}>
            {discountPercent !== null ? `${discountPercent}%` : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
