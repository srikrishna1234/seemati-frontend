// src/admin/AdminProductList.jsx
import React, { useEffect, useState } from "react";

/**
 * AdminProductList.jsx
 * - Fetches products from /admin-api/products
 * - Shows loading / error states
 * - Logs the raw response shape for debugging
 *
 * If your app normally uses axios, this uses fetch to avoid depending on
 * your axios instance during the debugging/deploy step. It will work
 * with the exact backend URL your browser used in the Network tab.
 */

export default function AdminProductList() {
  const [products, setProducts] = useState(null); // null = not loaded
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        // This matches the request URL seen in your DevTools:
        // https://seemati-backend.onrender.com/admin-api/products
        // Using a relative path will go through your Vercel frontend and the rewrite.
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
          console.error("AdminProductList: failed to parse JSON response:", parseErr, "text:", text);
          throw new Error("Invalid JSON from products endpoint");
        }

        // Debug log so you can inspect what's returned (open Console).
        console.debug("[AdminProductList] fetch response status:", res.status);
        console.debug("[AdminProductList] raw response object:", data);

        // Support both shapes:
        // 1) { success: true, products: [...] }
        // 2) axios-style res.data = { success: true, products: [...] } (if using axios)
        const arr = data.products || data.data || data.items || data || [];

        if (!cancelled) {
          // Ensure it's an array
          setProducts(Array.isArray(arr) ? arr : []);
          setLoading(false);
        }
      } catch (err) {
        console.error("AdminProductList load error:", err);
        if (!cancelled) {
          setError(err.message || "Unknown error");
          setProducts([]); // show empty list (not crashing)
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Small helper for rendering safe values
  const safe = (v) => (v === undefined || v === null ? "" : v);

  return (
    <div className="admin-products" style={{ padding: 20 }}>
      <h1>Products</h1>
      <div style={{ marginBottom: 8 }}>
        <button onClick={() => window.location.assign("/admin/products/add")}>Add product</button>
      </div>

      {loading && <div>Loading products…</div>}
      {error && (
        <div style={{ color: "crimson", marginBottom: 12 }}>
          Error loading products: {error}
        </div>
      )}

      {!loading && (!products || products.length === 0) && (
        <div style={{ marginTop: 12 }}>No products found.</div>
      )}

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
