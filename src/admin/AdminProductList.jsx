// src/admin/AdminProductList.jsx
import React, { useEffect, useState } from "react";

/**
 * Robust AdminProductList
 * - Try relative path first (so dev + correct rewrites still work)
 * - If response is HTML (index.html), fallback to the backend origin
 * - Prints helpful console.debug lines so you can verify behaviour live
 */

const BACKEND_ORIGIN = "https://seemati-backend.onrender.com";
const RELATIVE_PATH = "/admin-api/products"; // what your frontend has been calling

export default function AdminProductList() {
  const [products, setProducts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchJson(url, opts = {}) {
      const res = await fetch(url, { method: "GET", credentials: "include", ...opts });
      const ct = res.headers.get("content-type") || "";
      const text = await res.text();
      // If content-type says application/json, parse safely
      if (ct.includes("application/json")) {
        try {
          return { status: res.status, json: JSON.parse(text), rawText: text };
        } catch (err) {
          throw new Error("Invalid JSON from " + url + " — parse error");
        }
      }
      // If content-type NOT JSON, check whether body looks like HTML (index.html)
      const t = (text || "").trim();
      const looksLikeHtml = t.startsWith("<") || t.toLowerCase().startsWith("<!doctype");
      return { status: res.status, json: null, rawText: text, looksLikeHtml };
    }

    async function load() {
      setLoading(true);
      setError(null);

      try {
        console.debug("[AdminProductList] trying relative path:", RELATIVE_PATH);
        const r1 = await fetchJson(RELATIVE_PATH);

        if (r1.json) {
          console.debug("[AdminProductList] got JSON from relative path", r1);
          const arr = r1.json.products || r1.json.data || r1.json.items || r1.json || [];
          if (!cancelled) {
            setProducts(Array.isArray(arr) ? arr : []);
            setLoading(false);
          }
          return;
        }

        // If relative path returned HTML (index.html), fallback to backend origin
        if (r1.looksLikeHtml) {
          console.warn("[AdminProductList] relative path returned HTML (frontend served index), falling back to backend origin");
          const backendUrl = BACKEND_ORIGIN + RELATIVE_PATH;
          console.debug("[AdminProductList] trying backend URL:", backendUrl);
          const r2 = await fetchJson(backendUrl);

          if (r2.json) {
            console.debug("[AdminProductList] got JSON from backend origin", r2);
            const arr = r2.json.products || r2.json.data || r2.json.items || r2.json || [];
            if (!cancelled) {
              setProducts(Array.isArray(arr) ? arr : []);
              setLoading(false);
            }
            return;
          } else {
            // backend origin responded but not JSON (unexpected)
            throw new Error("Backend origin did not return JSON. Check backend logs.");
          }
        }

        // Unexpected: relative path returned non-JSON, non-HTML content
        console.error("[AdminProductList] unexpected response at relative path:", r1);
        throw new Error("Unexpected response from relative path");
      } catch (err) {
        console.error("[AdminProductList] load error:", err);
        if (!cancelled) {
          setError(err.message || "Unknown error");
          setProducts([]);
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
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
