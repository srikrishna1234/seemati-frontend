// src/admin/AdminProductList.js
import React, { useEffect, useState } from "react";
import axios from "../api/axiosInstance";

export default function AdminProductList() {
  const [products, setProducts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  console.debug("[AdminProductList.js] render");

  useEffect(() => {
    let cancelled = false;

    async function fetchProducts() {
      setLoading(true);
      setError(null);

      // token keys to try (after OTP login)
      const token =
        (typeof window !== "undefined" && localStorage.getItem("token")) ||
        (typeof window !== "undefined" && localStorage.getItem("authToken")) ||
        null;
      console.debug("[AdminProductList.js] token:", token ? "[present]" : "[none]");

      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Inspect axios baseURL to avoid double '/api' prefix problems
      let base = "";
      try {
        base = (axios && axios.defaults && axios.defaults.baseURL) || "";
      } catch (e) {
        base = "";
      }
      console.debug("[AdminProductList.js] axios.baseURL:", base || "[empty]");

      const baseHasApi = typeof base === "string" && /\/api\/?$/.test(base);
      console.debug("[AdminProductList.js] baseHasApi:", baseHasApi);

      // endpoints to try (we avoid doubling /api if axios base already contains it)
      const endpoints = baseHasApi
        ? ["/admin/products", "/products", "/products?page=1&limit=200"]
        : ["/api/admin/products", "/api/products", "/api/products?page=1&limit=200"];

      // Try endpoints using axios (respects baseURL)
      for (const ep of endpoints) {
        try {
          console.debug("[AdminProductList.js] trying axios.get(", ep, ")");
          const res = await axios.get(ep, { headers });
          if (res && (res.status === 200 || res.data)) {
            const data = res.data;
            const list = Array.isArray(data) ? data : data.products || data.products || [];
            console.debug("[AdminProductList.js] success from", ep, "count:", list.length);
            if (!cancelled) setProducts(list);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn("[AdminProductList.js] axios failed for", ep, e && e.message);
          // continue to next endpoint
        }
      }

      // Fallback to fetch('/api/products') — matches your local dev where /api/products works
      try {
        console.debug("[AdminProductList.js] axios failed; falling back to fetch('/api/products')");
        const resp = await fetch("/api/products", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
        });
        console.debug("[AdminProductList.js] fetch status:", resp.status);
        if (!resp.ok) {
          const txt = await resp.text().catch(() => null);
          throw new Error(`Fetch failed: ${resp.status} ${txt || resp.statusText}`);
        }
        const json = await resp.json();
        const list = Array.isArray(json) ? json : json.products || [];
        console.debug("[AdminProductList.js] fetch success, count:", list.length);
        if (!cancelled) setProducts(list);
        setLoading(false);
        return;
      } catch (fetchErr) {
        console.error("[AdminProductList.js] fetch fallback error:", fetchErr && fetchErr.message);
        if (!cancelled) setError(fetchErr.message || "Unable to load products");
        setLoading(false);
      }
    }

    fetchProducts();

    return () => {
      cancelled = true;
      console.debug("[AdminProductList.js] unmounted");
    };
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Admin — Products</h2>
        <p>Loading products… (see console for details)</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Admin — Products</h2>
        <p style={{ color: "red" }}>Error loading products: {String(error)}</p>
        <p>Check console logs for axios.baseURL and which endpoint was tried.</p>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Admin — Products</h2>
        <p>No products returned from API.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Admin — Products ({products.length})</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: 8 }}>SKU</th>
            <th style={{ textAlign: "left", padding: 8 }}>Name</th>
            <th style={{ textAlign: "left", padding: 8 }}>Category</th>
            <th style={{ textAlign: "left", padding: 8 }}>Price</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, i) => (
            <tr key={p._id || p.id || i}>
              <td style={{ padding: 8 }}>{p.sku || p.code || "-"}</td>
              <td style={{ padding: 8 }}>{p.title || p.name || p.slug || "-"}</td>
              <td style={{ padding: 8 }}>{p.category || "-"}</td>
              <td style={{ padding: 8 }}>{p.price || p.mrp || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
