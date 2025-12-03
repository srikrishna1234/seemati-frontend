// src/admin/AdminProductList.js
import React, { useEffect, useState } from "react";

/**
 * Identical to AdminProductList.jsx — included to avoid bundler/filename conflicts.
 */
export default function AdminProductList() {
  const [products, setProducts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/admin-api/products", {
          method: "GET",
          credentials: "include",
          headers: { "Accept": "application/json" },
        });
        const text = await res.text();
        let data;
        try {
          data = text ? JSON.parse(text) : {};
        } catch (parseErr) {
          console.error("AdminProductList.js: parse error", parseErr, text);
          throw new Error("Invalid JSON");
        }

        console.debug("[AdminProductList.js] status:", res.status, "data:", data);
        const arr = data.products || data.data || data.items || data || [];
        if (!cancelled) {
          setProducts(Array.isArray(arr) ? arr : []);
          setLoading(false);
        }
      } catch (err) {
        console.error("AdminProductList.js load error:", err);
        if (!cancelled) {
          setError(err.message || "Unknown error");
          setProducts([]);
          setLoading(false);
        }
      }
    }

    load();
    return () => (cancelled = true);
  }, []);

  const safe = (v) => (v === undefined || v === null ? "" : v);

  return (
    <div style={{ padding: 20 }}>
      <h1>Products</h1>
      <div style={{ marginBottom: 8 }}>
        <button onClick={() => window.location.assign("/admin/products/add")}>Add product</button>
      </div>

      {loading && <div>Loading products…</div>}
      {error && <div style={{ color: "crimson" }}>Error loading products: {error}</div>}
      {!loading && (!products || products.length === 0) && <div>No products found.</div>}

      {!loading && products && products.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "12px 8px", borderBottom: "1px solid #ddd" }}>Title</th>
                <th style={{ textAlign: "left", padding: "12px 8px", borderBottom: "1px solid #ddd" }}>Price</th>
                <th style={{ textAlign: "left", padding: "12px 8px", borderBottom: "1px solid #ddd" }}>Stock</th>
                <th style={{ textAlign: "left", padding: "12px 8px", borderBottom: "1px solid #ddd" }}>Category</th>
                <th style={{ textAlign: "left", padding: "12px 8px", borderBottom: "1px solid #ddd" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => {
                const id = p._id || p.id || `${i}`;
                return (
                  <tr key={id}>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f0f0" }}>{safe(p.title)}</td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f0f0" }}>{safe(p.price)}</td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f0f0" }}>{safe(p.stock)}</td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f0f0" }}>{safe(p.category)}</td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f0f0" }}>
                      <button onClick={() => window.location.assign(`/admin/products/${id}/edit`)}>Edit</button>
                      {" "}
                      <button onClick={() => window.open(p.images && p.images[0] && p.images[0].url ? p.images[0].url : "#", "_blank")}>View</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
