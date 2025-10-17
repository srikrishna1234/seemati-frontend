// src/pages/ProductListPage.jsx
import React, { useEffect, useRef, useState } from "react";
import ShopProductCard from "../shop/ShopProductCard";
import axios from "../api/axiosInstance";

export default function ProductListPage({ limit = 8 }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const fields = "title,price,mrp,compareAtPrice,slug,thumbnail,images,description";
        const res = await axios.get(`/api/products?page=1&limit=${limit}&fields=${encodeURIComponent(fields)}`);
        const data = res.data?.products ?? res.data ?? [];
        const normalized = (Array.isArray(data) ? data : []).map((p) => {
          const images = Array.isArray(p.images)
            ? p.images.map((i) => (typeof i === "string" ? { url: i } : (i.url ? { url: i.url } : (i.filename ? { url: `/uploads/${i.filename}` } : null)))).filter(Boolean)
            : [];
          return { ...p, images };
        });
        if (!mountedRef.current) return;
        setProducts(normalized);
      } catch (err) {
        console.error("Home product load error:", err);
        if (!mountedRef.current) return;
        setError(err.message || "Failed to load products");
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    }

    load();
  }, [limit]);

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ marginBottom: 12 }}>Products</h1>

      {loading && <div>Loading featured products…</div>}
      {error && <div style={{ color: "crimson" }}>Failed to load products: {error}</div>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 18,
          alignItems: "start",
          marginTop: 12,
        }}
      >
        {products.map((p) => (
          <ShopProductCard key={p.slug || p._id || p.id} product={p} />
        ))}
      </div>

      {!loading && !products.length && !error && (
        <div style={{ marginTop: 12 }}>No featured products.</div>
      )}
    </div>
  );
}
