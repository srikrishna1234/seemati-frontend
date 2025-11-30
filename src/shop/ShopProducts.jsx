import React, { useEffect, useState } from "react";
import axios from "../api/axiosInstance"; // keep existing axios instance
import ShopProductCard from "./shopProductCard";

/**
 * ShopProducts.jsx
 * - Fetches products and renders a grid of ShopProductCard
 * - Renders a fixed free-shipping bar at the bottom with single-line layout
 *
 * Drop this file into src/shop/ShopProducts.jsx (replace existing).
 */

export default function ShopProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [freeShippingInfo, setFreeShippingInfo] = useState({
    text: "Free shipping above ₹999 — Subtotal ₹0.00 · Add ₹999.00 more to get free shipping",
  });

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        // Adjust the endpoint/fields to match your backend
        const res = await axios.get("/api/products?page=1&limit=100&fields=_id,title,slug,price,thumbnail,images");
        if (!mounted) return;
        setProducts(res?.data?.data || res?.data || []);
      } catch (err) {
        console.error("Failed to load products", err);
        setProducts([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => (mounted = false);
  }, []);

  function handleView(product) {
    // default navigation: open product detail route (adjust as required)
    window.location.href = `/product/${product.slug || product._id}`;
  }

  function handleExplore(product) {
    // placeholder for Explore action - maybe open quick view
    console.log("Explore", product);
  }

  return (
    <div style={{ padding: "18px" }}>
      <h2 style={{ marginBottom: 12 }}>Shop</h2>

      {loading ? (
        <div>Loading products…</div>
      ) : (
        <div style={gridStyle}>
          {products.map((p) => (
            <ShopProductCard
              key={p._id}
              product={p}
              onView={handleView}
              onExplore={handleExplore}
            />
          ))}
        </div>
      )}

      {/* fixed free-shipping bar (single-line) */}
      <div className="free-shipping-bar" role="region" aria-label="free-shipping">
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>🚚</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, lineHeight: "18px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              Free shipping above ₹999
            </div>
            <div style={{ fontSize: 13, lineHeight: "16px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {freeShippingInfo.text}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="continue-shopping-btn" style={continueBtnStyle}>Continue shopping</button>
          <button className="dismiss-btn" style={dismissBtnStyle} onClick={() => {
            // simple dismiss: hide bar for this session
            document.querySelectorAll(".free-shipping-bar").forEach(el => el.style.display = 'none');
          }}>Dismiss</button>
        </div>
      </div>

      {/* minimal CSS placed inline to make file drop-in friendly */}
      <style>{`
        .free-shipping-bar {
          position: fixed;
          left: 12px;
          right: 12px;
          bottom: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 8px 12px; /* reduced vertical padding to keep single-line */
          border-radius: 12px;
          box-shadow: 0 6px 18px rgba(12, 74, 65, 0.06);
          background: #ecfdf5;
          z-index: 9999;
          white-space: nowrap; /* important: single line */
          overflow: hidden;
          text-overflow: ellipsis;
          font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
        }

        .continue-shopping-btn {
          background: #6b21a8;
          color: #fff;
          border: none;
          padding: 8px 12px;
          border-radius: 8px;
          cursor: pointer;
        }

        .dismiss-btn {
          background: transparent;
          border: none;
          text-decoration: underline;
          cursor: pointer;
          font-size: 13px;
        }

        /* responsive: on very narrow viewports allow up to 2 lines */
        @media (max-width: 420px) {
          .free-shipping-bar { white-space: normal; padding: 10px; }
        }
      `}</style>
    </div>
  );
}

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
  gap: 14,
  alignItems: "start",
};

const continueBtnStyle = {
  borderRadius: 8,
  padding: "8px 12px",
  cursor: "pointer",
  color: "#fff",
  background: "#6b21a8",
  border: "none",
};

const dismissBtnStyle = {
  border: "none",
  background: "transparent",
  cursor: "pointer",
  textDecoration: "underline",
};
