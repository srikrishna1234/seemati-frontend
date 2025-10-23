// src/shop/ShopProducts.jsx
import React, { useEffect, useState } from "react";
import ShopProductCard from "./ShopProductCard";
import axios from "../api/axiosInstance"; // uses the baseURL from env or default

export default function ShopProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function loadProducts(page = 1, limit = 8) {
    setLoading(true);
    setError(null);
    try {
      // backend uses /products
      const res = await axios.get("/products", {
        params: {
          page,
          limit,
          fields: "title,price,mrp,compareAtPrice,slug,thumbnail,images,description",
        },
      });

      // server returns array or { products: [...] } — handle both shapes
      const data = res.data;
      const list = Array.isArray(data) ? data : data.products ?? data.items ?? [];

      // Prefer REACT_APP_API_BASE_URL (matches axiosInstance) then REACT_APP_API_URL then production fallback
      const apiBase =
        process.env.REACT_APP_API_BASE_URL ||
        process.env.REACT_APP_API_URL ||
        "https://seemati-backend.onrender.com";

      const normalized = list.map((p) => {
        const images =
          Array.isArray(p.images) &&
          p.images
            .map((i) => {
              if (!i) return null;
              // strings (simple paths)
              if (typeof i === "string") {
                if (/^https?:\/\//i.test(i)) {
                  // If the URL points to localhost (e.g. returned from dev backend), replace host with apiBase host
                  if (/https?:\/\/(localhost|127\.0\.0\.1)/i.test(i)) {
                    return i.replace(/^https?:\/\/[^/]+/i, apiBase);
                  }
                  return i;
                }
                // relative path: /uploads/xxx or uploads/xxx
                return i.startsWith("/") ? `${apiBase}${i}` : `${apiBase}/uploads/${i}`;
              }
              // object form
              if (i.url) {
                const u = String(i.url);
                if (/^https?:\/\//i.test(u)) {
                  if (/https?:\/\/(localhost|127\.0\.0\.1)/i.test(u)) {
                    return u.replace(/^https?:\/\/[^/]+/i, apiBase);
                  }
                  return u;
                }
                return u.startsWith("/") ? `${apiBase}${u}` : `${apiBase}/${u}`;
              }
              if (i.filename) {
                return `${apiBase}/uploads/${i.filename}`;
              }
              return null;
            })
            .filter(Boolean);
        return { ...p, images };
      });

      setProducts(normalized);
    } catch (err) {
      console.error("loadProducts error", err);
      setError(err.message || "Failed to load products");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Products</h2>
        <p>Loading featured products…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Products</h2>
        <div style={{ color: "#b91c1c" }}>Failed to load products: {String(error)}</div>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Products</h2>
        <div>No products found.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Products</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginTop: 16,
        }}
      >
        {products.map((p) => (
          <ShopProductCard key={p._id ?? p.id ?? p.slug} product={p} />
        ))}
      </div>
    </div>
  );
}
