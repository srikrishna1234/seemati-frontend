// src/pages/ProductListPage.jsx
import React, { useEffect, useRef, useState } from "react";
import ShopProductCard from "../shop/ShopProductCard";
import axios from "../api/axiosInstance";

/**
 * Small helper to normalize/resolve image objects/URLs to absolute URLs
 * using REACT_APP_API_URL when needed.
 */
function resolveImageObject(i) {
  const apiBase = process.env.REACT_APP_API_URL || "http://localhost:4000";

  if (!i) return null;

  // If it's a string, interpret as URL or filename
  if (typeof i === "string") {
    if (/^https?:\/\//.test(i)) {
      // absolute URL: if it contains localhost, swap host
      if (i.includes("localhost")) {
        return i.replace(/^https?:\/\/[^/]+/, apiBase);
      }
      return i;
    }
    // relative path or bare filename
    if (i.startsWith("/")) return `${apiBase}${i}`;
    return `${apiBase}/uploads/${i}`;
  }

  // object shape { url } or { filename }
  if (i.url) {
    const u = i.url;
    if (/^https?:\/\//.test(u)) {
      return u.includes("localhost") ? u.replace(/^https?:\/\/[^/]+/, apiBase) : u;
    }
    if (u.startsWith("/")) return `${apiBase}${u}`;
    return `${apiBase}/${u}`;
  }
  if (i.filename) {
    return `${apiBase}/uploads/${i.filename}`;
  }
  return null;
}

export default function ProductListPage({ limit = 8 }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const fields =
          "title,price,mrp,compareAtPrice,slug,thumbnail,images,description";
        // NOTE: backend exposes /products (not /api/products)
        const res = await axios.get(
          `/products?page=1&limit=${limit}&fields=${encodeURIComponent(fields)}`
        );

        const data = res.data?.products ?? res.data ?? [];
        const normalized = (Array.isArray(data) ? data : []).map((p) => {
          const images = Array.isArray(p.images)
            ? p.images
                .map((i) => {
                  if (!i) return null;
                  if (typeof i === "string") {
                    const url = resolveImageObject(i);
                    return url ? { url } : null;
                  }
                  // object with url or filename
                  if (i.url || i.filename) {
                    return { url: resolveImageObject(i) };
                  }
                  return null;
                })
                .filter(Boolean)
            : [];
          // support thumbnail / image fields too
          let thumbnail = null;
          const th = p.thumbnail ?? p.image ?? null;
          if (th) {
            thumbnail = typeof th === "string" ? resolveImageObject(th) : resolveImageObject(th);
          }
          return { ...p, images, thumbnail };
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
      {error && (
        <div style={{ color: "crimson" }}>Failed to load products: {error}</div>
      )}

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
