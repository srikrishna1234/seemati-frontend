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
        withCredentials: true,
      });

      // server returns { ok: true, products: [...] } — handle both shapes just in case
      const data = res.data;
      const list = Array.isArray(data) ? data : data.products ?? data.items ?? [];
      // Normalize images to have .images[].url as absolute
      // (ShopProductCard will also resolve but keep normalized here)
      const apiBase = process.env.REACT_APP_API_URL || "http://localhost:4000";
      const normalized = list.map((p) => {
        const images =
          Array.isArray(p.images) &&
          p.images
            .map((i) => {
              if (!i) return null;
              if (typeof i === "string") {
                if (/^https?:\/\//.test(i)) {
                  return i.includes("localhost") ? i.replace(/^https?:\/\/[^/]+/, apiBase) : i;
                }
                return i.startsWith("/") ? `${apiBase}${i}` : `${apiBase}/uploads/${i}`;
              }
              if (i.url) {
                const u = i.url;
                if (/^https?:\/\//.test(u)) {
                  return u.includes("localhost") ? u.replace(/^https?:\/\/[^/]+/, apiBase) : u;
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
      // axiosInstance already normalizes messages — show friendly message
      console.error("loadProducts error", err);
      setError(err.message || "Failed to load products");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
    // no dependencies -> load once on mount
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
