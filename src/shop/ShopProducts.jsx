// src/shop/ShopProducts.jsx
import React, { useEffect, useMemo, useState } from "react";
import ShopProductCard from "./shopProductCard";
import { Helmet } from "react-helmet";
import { useLocation } from "react-router-dom";

const PAGE_SIZE = 12;

export default function ShopProducts({ preview = false }) {
  const location = useLocation();

  // 🔹 Read ?q= from URL
  const searchParams = new URLSearchParams(location.search);
  const urlQuery = searchParams.get("q") || "";

  const [products, setProducts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [query, setQuery] = useState(urlQuery);
  const [page, setPage] = useState(1);

  // 🔹 Sync URL query → input box
  useEffect(() => {
    setQuery(urlQuery);
    setPage(1);
  }, [urlQuery]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const resp = await fetch("/api/products");
        if (!mounted) return;

        if (!resp.ok) {
          throw new Error(`Public /api/products failed with ${resp.status}`);
        }

        const data = await resp.json();
        setProducts(normalizeArray(data));
      } catch (err) {
        console.error("ShopProducts fetch error:", err);
        if (!mounted) return;
        setError("Unable to load products from shop API.");
        setProducts([]);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  function normalizeArray(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.products && Array.isArray(data.products)) return data.products;
    if (data.docs && Array.isArray(data.docs)) return data.docs;
    if (data.items && Array.isArray(data.items)) return data.items;
    const arr = Object.values(data).find(v => Array.isArray(v));
    return arr || [];
  }

  // 🔹 FILTER PRODUCTS USING QUERY
  const filtered = useMemo(() => {
    if (!products || products.length === 0) return [];
    if (!query) return products;

    const q = query.trim().toLowerCase();
    return products.filter(p => {
      const s = `${p.title || ""} ${p.description || ""} ${(p.tags || []).join(" ")}`.toLowerCase();
      return s.includes(q);
    });
  }, [products, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  return (
    <div style={{ padding: preview ? 0 : "18px 24px", maxWidth: 1200, margin: "0 auto" }}>
      <Helmet>
        <title>Shop — Seemati</title>
      </Helmet>

      {!preview && (
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <input
            placeholder="Search products, brands and more"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 6,
              border: "1px solid #ddd",
            }}
          />
          <button
            onClick={() => setQuery("")}
            style={{
              padding: "10px 14px",
              background: "#6b21a8",
              color: "#fff",
              border: "none",
              borderRadius: 6,
            }}
          >
            Clear
          </button>
        </div>
      )}

      {!preview && (
        <div style={{ marginBottom: 10, color: "#444" }}>
          Showing <strong>{filtered.length}</strong> products
        </div>
      )}

      {loading && <div>Loading products…</div>}
      {!loading && error && <div style={{ color: "red" }}>{error}</div>}

      {!loading && filtered.length === 0 && (
        <div>No products found.</div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 16,
        }}
      >
        {pageItems.map(p => (
          <ShopProductCard key={p._id || p.slug} product={p} />
        ))}
      </div>

      {!preview && totalPages > 1 && (
        <div style={{ marginTop: 20, display: "flex", justifyContent: "center", gap: 10 }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
