// src/shop/ShopProducts.jsx
import React, { useEffect, useMemo, useState } from "react";
import ShopProductCard from "./shopProductCard";
import { Helmet } from "react-helmet";
import axiosInstance from "../api/axiosInstance";

/**
 * ShopProducts (robust)
 *
 * - Uses axiosInstance (respects baseURL) and detects whether baseURL already contains '/api'
 *   to avoid double '/api/api' problems in different environments.
 * - Falls back to fetch('/api/products') if axios fails (keeps dev workflow working).
 * - Keeps existing UI (search, pagination, preview) and error messaging.
 */

const PAGE_SIZE = 12;

export default function ShopProducts({ preview = false }) {
  const [products, setProducts] = useState(null); // null = loading, [] = loaded empty
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        // detect axios baseURL ending with '/api' to avoid double prefixing
        let base = "";
        try {
          base = (axiosInstance && axiosInstance.defaults && axiosInstance.defaults.baseURL) || "";
        } catch (e) {
          base = "";
        }
        const baseHasApi = typeof base === "string" && /\/api\/?$/.test(base);

        const endpoint = baseHasApi ? "/products" : "/api/products"; // axiosInstance will prepend baseURL

        // Use axiosInstance so it respects production baseURL or dev host
        try {
          const resp = await axiosInstance.get(endpoint);
          if (!mounted) return;
          const data = resp && resp.data ? resp.data : null;
          setProducts(normalizeArray(data));
          setLoading(false);
          return;
        } catch (err) {
          console.warn("ShopProducts: axios failed", err && err.message);
          // continue to fallback to fetch below
        }

        // Fallback: try fetch to /api/products (dev server commonly expects this)
        try {
          const fResp = await fetch("/api/products", { credentials: "include" });
          if (!mounted) return;
          if (!fResp.ok) throw new Error(`Fallback fetch /api/products returned ${fResp.status}`);
          const json = await fResp.json();
          setProducts(normalizeArray(json));
          setLoading(false);
          return;
        } catch (fErr) {
          console.warn("ShopProducts: fetch fallback failed", fErr && fErr.message);
          throw fErr;
        }
      } catch (err) {
        console.error("ShopProducts fetch error:", err);
        if (!mounted) return;
        setError(
          "Unable to load products. Check that the backend is running and that /api/products responds. See console for details."
        );
        setProducts([]);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  // normalize responses: either array or object { products: [...] } etc.
  function normalizeArray(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.products && Array.isArray(data.products)) return data.products;
    if (data.docs && Array.isArray(data.docs)) return data.docs;
    if (data.items && Array.isArray(data.items)) return data.items;
    const arr = Object.values(data).find((v) => Array.isArray(v));
    if (arr) return arr;
    return [];
  }

  // derived: filtered by search query (client-side)
  const filtered = useMemo(() => {
    if (!products || products.length === 0) return [];
    if (!query) return products;
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const s = `${p.title || p.name || p.slug || ""} ${p.description || ""} ${p.tags ? p.tags.join(" ") : ""}`.toLowerCase();
      return s.includes(q);
    });
  }, [products, query]);

  // pagination
  const totalPages = Math.max(1, Math.ceil((filtered || []).length / PAGE_SIZE));
  const pageItems = useMemo(() => {
    if (!filtered) return [];
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  // when preview mode, show a limited set (first 4 matching items)
  const previewItems = preview ? (filtered || []).slice(0, 4) : pageItems;

  const gotoPage = (p) => {
    const clamped = Math.max(1, Math.min(totalPages, p));
    setPage(clamped);
    window.scrollTo({ top: 280, behavior: "smooth" });
  };

  return (
    <div style={{ padding: preview ? 0 : "18px 24px", maxWidth: 1200, margin: preview ? "0" : "0 auto" }}>
      <Helmet>
        <title>{preview ? "Featured — Seemati" : "Shop — Seemati"}</title>
      </Helmet>

      {/* show search/pager only when not previewing */}
      {!preview && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <input
            aria-label="Search products"
            placeholder="Search products, brands and more"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 6,
              border: "1px solid #ddd",
              minWidth: 250,
            }}
          />
          <button
            onClick={() => {
              setQuery("");
            }}
            style={{
              padding: "10px 14px",
              background: "#6b21a8",
              color: "#fff",
              border: "none",
              borderRadius: 6,
            }}
          >
            Search
          </button>
        </div>
      )}

      {/* hero (small) shown only when not in preview */}
      {!preview && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ height: 220, borderRadius: 8, background: "linear-gradient(90deg,#fff7f0,#fffefc)", display: "flex", alignItems: "center", padding: 20 }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0 }}>Seemati — Confident & Stylish</h2>
              <p style={{ marginTop: 6, color: "#555" }}>Comfort-first kurti pants and palazzos — made for every day</p>
            </div>
          </div>
        </div>
      )}

      {/* content */}
      <section>
        {loading && (
          <div style={{ padding: 20 }}>
            <strong>Loading products…</strong>
            <div style={{ marginTop: 8, color: "#666" }}>If loading hangs, check Console and that /api/products returns JSON.</div>
          </div>
        )}

        {!loading && error && (
          <div style={{ padding: 20, border: "1px dashed #f00", borderRadius: 6 }}>
            <strong style={{ color: "#b91c1c" }}>Could not load products</strong>
            <div style={{ marginTop: 8 }}>{error}</div>
          </div>
        )}

        {!loading && products && products.length === 0 && (
          <div style={{ padding: 20 }}>No products found.</div>
        )}

        {!loading && products && products.length > 0 && (
          <>
            {!preview && (
              <div style={{ marginBottom: 12, color: "#444" }}>
                Showing <strong>{filtered.length}</strong> products {query ? <>matching <em>"{query}"</em></> : null}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
              {(preview ? previewItems : pageItems).map((p) => (
                <ShopProductCard product={p} key={p._id || p.id || p.slug || `${p.title}-${Math.random()}`} />
              ))}
            </div>

            {/* pagination (hidden in preview) */}
            {!preview && (
              <div style={{ marginTop: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <button onClick={() => gotoPage(page - 1)} disabled={page === 1} style={pagerBtnStyle}>
                  Prev
                </button>

                <div style={{ padding: "6px 10px", borderRadius: 6, background: "#fff" }}>
                  Page {page} of {totalPages}
                </div>

                <button onClick={() => gotoPage(page + 1)} disabled={page === totalPages} style={pagerBtnStyle}>
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

const pagerBtnStyle = {
  padding: "8px 12px",
  borderRadius: 6,
  border: "1px solid #ddd",
  background: "#fff",
  cursor: "pointer",
};
