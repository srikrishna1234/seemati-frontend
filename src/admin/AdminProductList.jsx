// src/admin/AdminProductList.jsx
// Full replacement — robust Admin product list that safely handles
// - relative /admin-api proxy returning JSON
// - relative /admin-api returning frontend index (HTML) -> fallback to backend origin
// - fallback to public /api/products if backend origin unreachable
// - includes credentials so cookies are sent when available

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

// Keep these constants configurable and explicit
const BACKEND_ORIGIN = "https://seemati-backend.onrender.com"; // backend origin (Render)
const RELATIVE_ADMIN_PATH = "/admin-api/products"; // used when proxying admin api through same origin
const PUBLIC_PRODUCTS_PATH = "/api/products"; // public API that returns products JSON

export default function AdminProductList() {
  const [products, setProducts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    // wrapper that fetches and returns parsed JSON or raw text and metadata
    async function fetchJsonOrText(url, opts = {}) {
      const res = await fetch(url, { method: "GET", credentials: "include", ...opts });
      const ct = String(res.headers.get("content-type") || "").toLowerCase();
      const text = await res.text();

      // If JSON content-type, try parse
      if (ct.includes("application/json")) {
        try {
          const json = JSON.parse(text);
          return { status: res.status, json, rawText: text };
        } catch (err) {
          // fall through and return raw text with parse error info
          return { status: res.status, json: null, rawText: text, parseError: true };
        }
      }

      // detect html (index.html) by presence of doctype / html tag
      const looksLikeHtml = /<!doctype html/i.test(text) || /<html[\s>]/i.test(text) || text.trim().startsWith("<");
      return { status: res.status, json: null, rawText: text, looksLikeHtml };
    }

    async function load() {
      setLoading(true);
      setError(null);

      try {
        console.debug("[AdminProductList] trying relative path:", RELATIVE_ADMIN_PATH);
        const r1 = await fetchJsonOrText(RELATIVE_ADMIN_PATH);

        if (r1.json) {
          console.debug("[AdminProductList] got JSON from relative path", r1);
          const arr = r1.json.products || r1.json.data || r1.json.items || (Array.isArray(r1.json) ? r1.json : null) || [];
          if (!cancelled) setProducts(Array.isArray(arr) ? arr : []);
          return;
        }

        // If relative returned HTML or index page, the app served SPA instead of API
        if (r1.looksLikeHtml) {
          console.warn("[AdminProductList] relative path returned HTML (frontend served index), falling back to backend origin");

          // try backend origin + relative path (same route mounted on backend)
          const backendUrl = BACKEND_ORIGIN + RELATIVE_ADMIN_PATH;
          console.debug("[AdminProductList] trying backend URL:", backendUrl);
          try {
            const r2 = await fetchJsonOrText(backendUrl);
            if (r2.json) {
              console.debug("[AdminProductList] got JSON from backend origin", r2);
              const arr2 = r2.json.products || r2.json.data || r2.json.items || (Array.isArray(r2.json) ? r2.json : null) || [];
              if (!cancelled) setProducts(Array.isArray(arr2) ? arr2 : []);
              return;
            }
            // backend didn't return JSON — fallthrough to public API
            console.warn("[AdminProductList] backend origin did not return JSON, falling back to public API", r2);
          } catch (e2) {
            console.error("[AdminProductList] backend origin fetch failed", e2);
          }
        }

        // If we reach here, try the public products API as last-resort
        console.debug("[AdminProductList] trying public products path:", PUBLIC_PRODUCTS_PATH);
        const rf = await fetchJsonOrText(PUBLIC_PRODUCTS_PATH);
        if (rf.json) {
          console.debug("[AdminProductList] got JSON from public products path", rf);
          const arrf = rf.json.products || rf.json.data || rf.json.items || (Array.isArray(rf.json) ? rf.json : null) || [];
          if (!cancelled) setProducts(Array.isArray(arrf) ? arrf : []);
          return;
        }

        // If even fallback returns HTML or invalid content
        console.error("[AdminProductList] unexpected responses; r1:", r1, "fallback:", rf);
        throw new Error("Products fetch returned unexpected content. Check backend or network.");
      } catch (err) {
        console.error("[AdminProductList] load error:", err);
        if (!cancelled) {
          setError(err.message || "Unknown error");
          setProducts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // small helpers
  const safe = (v) => (v === undefined || v === null ? "" : v);

  const getThumbnailUrl = (p) => {
    if (!p) return null;
    if (typeof p.thumbnail === "string" && p.thumbnail.trim()) return p.thumbnail.trim();
    if (Array.isArray(p.images) && p.images.length > 0) {
      // image items may be strings or objects { url }
      const first = p.images[0];
      if (typeof first === "string") return first;
      if (first && (first.url || first.src)) return first.url || first.src;
    }
    return null;
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Products</h1>
      <div style={{ marginBottom: 8 }}>
        <Link to="/admin/products/add">
          <button>Add product</button>
        </Link>
      </div>

      {loading && <div>Loading products…</div>}
      {error && <div style={{ color: "crimson" }}>Error loading products: {error}</div>}
      {!loading && (!products || products.length === 0) && <div>No products found.</div>}

      {!loading && products && products.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "12px 8px", borderBottom: "1px solid #ddd", width: 90 }}>
                  Thumbnail
                </th>
                <th style={{ textAlign: "left", padding: "12px 8px", borderBottom: "1px solid #ddd" }}>
                  Title
                </th>
                <th style={{ textAlign: "left", padding: "12px 8px", borderBottom: "1px solid #ddd" }}>
                  Price
                </th>
                <th style={{ textAlign: "left", padding: "12px 8px", borderBottom: "1px solid #ddd" }}>
                  Stock
                </th>
                <th style={{ textAlign: "left", padding: "12px 8px", borderBottom: "1px solid #ddd" }}>
                  Category
                </th>
                <th style={{ textAlign: "left", padding: "12px 8px", borderBottom: "1px solid #ddd" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => {
                const id = p._id || p.id || `${i}`;
                const thumbUrl = getThumbnailUrl(p);

                return (
                  <tr key={id}>
                    <td style={{ padding: "8px 8px", borderBottom: "1px solid #f0f0f0", verticalAlign: "middle" }}>
                      {thumbUrl ? (
                        <img
                          src={thumbUrl}
                          alt={safe(p.title) || "Product thumbnail"}
                          style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 4, border: "1px solid #eee" }}
                          loading="lazy"
                        />
                      ) : (
                        <span style={{ fontSize: 12, color: "#999" }}>No image</span>
                      )}
                    </td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f0f0" }}>{safe(p.title)}</td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f0f0" }}>{safe(p.price)}</td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f0f0" }}>{safe(p.stock)}</td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f0f0" }}>{safe(p.category)}</td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f0f0f0" }}>
                      <Link to={`/admin/products/${id}/edit`}>
                        <button>Edit</button>
                      </Link>{" "}
                      <a href={thumbUrl || (p.images && p.images[0] && (p.images[0].url || p.images[0])) || "#"} target="_blank" rel="noreferrer">
                        <button>View</button>
                      </a>
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
