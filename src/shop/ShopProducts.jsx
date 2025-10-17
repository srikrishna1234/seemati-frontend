// src/shop/ShopProducts.jsx
import React, { useEffect, useRef, useState } from "react";
import ShopProductCard from "./ShopProductCard";
import axios from "../api/axiosInstance";

function FreeShippingBar({ min = 999 }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        bottom: 12,
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(900px, 94%)",
        maxWidth: 960,
        background: "#10b981",
        color: "#fff",
        fontWeight: 700,
        padding: "12px 22px",
        borderRadius: 999,
        boxShadow: "0 10px 30px rgba(16,185,129,0.14)",
        zIndex: 9999,
        fontSize: 15,
        display: "flex",
        alignItems: "center",
        gap: 12,
        justifyContent: "center",
        pointerEvents: "auto",
      }}
    >
      <span style={{ fontSize: 18 }}>🚚</span>
      <span style={{ lineHeight: 1 }}>Free Shipping on orders above <strong>₹{min}</strong></span>
    </div>
  );
}

export default function ShopProducts({ limit = 24 }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(false);

  // responsive columns state
  const [cols, setCols] = useState(getCols(window.innerWidth));

  useEffect(() => {
    mountedRef.current = true;
    function onResize() { setCols(getCols(window.innerWidth)); }
    window.addEventListener("resize", onResize);
    return () => { mountedRef.current = false; window.removeEventListener("resize", onResize); };
  }, []);

  function getCols(width) {
    // preference: 4 columns on wide screens, fallbacks below
    if (width >= 1300) return 4;
    if (width >= 1000) return 4; // keep 4 for medium-large
    if (width >= 800) return 3;
    if (width >= 560) return 2;
    return 1;
  }

  async function loadPage(p = 1) {
    setError(null);
    setLoading(true);
    try {
      const fields = "title,price,mrp,compareAtPrice,slug,thumbnail,images,description";
      const res = await axios.get(`/api/products?page=${p}&limit=${limit}&fields=${encodeURIComponent(fields)}`);
      const data = res.data?.products ?? res.data ?? [];
      if (!mountedRef.current) return;
      if (p === 1) setProducts(Array.isArray(data) ? data : []);
      else setProducts(prev => [...prev, ...(Array.isArray(data) ? data : [])]);
      setHasMore((res.data?.products?.length ?? data.length) >= limit);
      setPage(p);
    } catch (err) {
      console.error("Shop load error:", err);
      if (!mountedRef.current) return;
      setError(err.message || "Failed to load products");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  useEffect(() => { loadPage(1); }, [limit]);

  function loadMore() { loadPage(page + 1); }

  // bottom padding keeps free-shipping bar below content
  const containerStyle = {
    padding: "8px 28px 420px",
  };

  // grid styles: set columns via CSS gridTemplateColumns dynamically
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, minmax(280px, 1fr))`,
    columnGap: 20,
    rowGap: 56, // increased vertical gap between rows (makes next row offscreen)
    alignItems: "start",
    marginTop: 12,
  };

  return (
    <div style={containerStyle}>
      <h1 style={{ marginTop: 16 }}>Products</h1>

      {error && (
        <div style={{ color: "crimson", padding: 8 }}>
          Fetch failed: {error} <button onClick={() => loadPage(1)}>Retry</button>
        </div>
      )}

      <div className="products-grid" style={gridStyle}>
        {products.map((p) => (
          <ShopProductCard key={p.slug || p._id} product={p} />
        ))}
      </div>

      {loading && <p style={{ padding: 12 }}>Loading products…</p>}

      {!loading && hasMore && (
        <div style={{ textAlign: "center", margin: 12 }}>
          <button onClick={loadMore}>Load more</button>
        </div>
      )}

      {!loading && !products.length && <p style={{ padding: 12 }}>No products found.</p>}

      <FreeShippingBar min={999} />
    </div>
  );
}
