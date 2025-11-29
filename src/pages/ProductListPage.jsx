// src/pages/ProductListPage.jsx
import React, { useEffect, useRef, useState } from "react";
import ShopProductCard from "../shop/shopProductCard";
import axios from "../api/axiosInstance";

/**
 * Small helper to normalize/resolve image objects/URLs to absolute URLs
 * using REACT_APP_API_BASE_URL (preferred), then REACT_APP_API_URL, then
 * a hardcoded deployed backend fallback.
 */
function resolveImageObject(i) {
  const apiBase =
    process.env.REACT_APP_API_BASE_URL ||
    process.env.REACT_APP_API_URL ||
    "https://seemati-backend.onrender.com";

  if (!i) return null;

  // If it's a string, interpret as URL or filename
  if (typeof i === "string") {
    // absolute URL: rewrite localhost host to apiBase
    if (/^https?:\/\//i.test(i)) {
      if (/https?:\/\/(localhost|127\.0\.0\.1)/i.test(i)) {
        return i.replace(/^https?:\/\/[^/]+/i, apiBase);
      }
      return i;
    }
    // relative path or bare filename
    if (i.startsWith("/")) return `${apiBase}${i}`;
    return `${apiBase}/uploads/${i}`;
  }

  // object shape { url } or { filename }
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
            thumbnail =
              typeof th === "string" ? resolveImageObject(th) : resolveImageObject(th);
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

