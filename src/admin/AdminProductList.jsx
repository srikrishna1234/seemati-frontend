// src/admin/AdminProductList.jsx
import React, { useEffect, useState } from "react";

// Try to import your shared axios instance if it exists.
// If not present, the component will still work via fetch().
let axios;
try {
  // adjust path if your axios instance is at a different path
  // you previously had api/axiosInstance.js — keep that same path
  // eslint-disable-next-line import/no-unresolved
  axios = require("../api/axiosInstance").default;
} catch (err) {
  axios = null;
  // no-op; we'll fallback to fetch
}

export default function AdminProductList() {
  const [products, setProducts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  console.log("[AdminProductList] render - products:", products);

  useEffect(() => {
    console.log("[AdminProductList] mounted, starting fetchProducts");
    let cancelled = false;

    async function fetchProducts() {
      setLoading(true);
      setError(null);

      // Try to get auth token commonly saved after OTP login
      const token =
        (typeof window !== "undefined" && localStorage.getItem("token")) ||
        (typeof window !== "undefined" && localStorage.getItem("authToken")) ||
        null;
      console.log("[AdminProductList] token from localStorage:", token);

      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // First try axios (if available)
      if (axios) {
        try {
          console.log("[AdminProductList] Using axios to GET /admin/products (or /api/admin/products)");
          // Attempt common endpoints. Adjust if your backend path differs.
          const endpointsToTry = [
            "/api/admin/products",
            "/admin/products",
            "/api/products",
            "/products",
          ];
          let res = null;
          for (const ep of endpointsToTry) {
            try {
              console.log("[AdminProductList] trying axios GET", ep);
              // axios may have baseURL set already
              res = await axios.get(ep, { headers });
              if (res && (res.data || res.status === 200)) {
                console.log("[AdminProductList] axios success from", ep, res);
                break;
              }
            } catch (e) {
              console.warn("[AdminProductList] axios try failed for", ep, e && e.message);
              // continue trying other endpoints
            }
          }
          if (!res) {
            throw new Error("No axios response from any endpoint tried");
          }
          if (!cancelled) setProducts(Array.isArray(res.data) ? res.data : res.data.products || []);
        } catch (err) {
          console.error("[AdminProductList] axios error:", err);
          if (!cancelled) setError(err.message || "Axios error");
        } finally {
          if (!cancelled) setLoading(false);
        }
        return;
      }

      // Fallback: use fetch()
      try {
        console.log("[AdminProductList] axios not available. Using fetch fallback to /api/admin/products");
        const resp = await fetch("/api/admin/products", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
        });
        console.log("[AdminProductList] fetch response status:", resp.status);
        if (!resp.ok) {
          const text = await resp.text().catch(() => null);
          throw new Error(`Fetch failed: ${resp.status} ${text || resp.statusText}`);
        }
        const data = await resp.json().catch(() => null);
        console.log("[AdminProductList] fetch data:", data);
        if (!cancelled) setProducts(Array.isArray(data) ? data : data.products || []);
      } catch (err) {
        console.error("[AdminProductList] fetch error:", err);
        if (!cancelled) setError(err.message || "Fetch error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProducts();

    return () => {
      cancelled = true;
      console.log("[AdminProductList] unmounted / cancelled");
    };
  }, []); // run once on mount

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Admin — Products</h2>
        <p>Loading products… (check Console for logs)</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Admin — Products</h2>
        <p style={{ color: "red" }}>Error loading products: {String(error)}</p>
        <p>Open DevTools Console → Network to verify requests. Also check localStorage token keys.</p>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Admin — Products</h2>
        <p>No products found (empty array). If you expect products, check that the API endpoint is correct and that the user is authenticated.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Admin — Products ({products.length})</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>SKU</th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Name</th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Category</th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Price</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, i) => (
            <tr key={p._id || p.id || i}>
              <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>{p.sku || p.code || "-"}</td>
              <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>{p.name || p.title || "-"}</td>
              <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>{p.category || p.cat || "-"}</td>
              <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>{p.price || p.mrp || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
