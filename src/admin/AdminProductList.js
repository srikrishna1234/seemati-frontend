// src/admin/AdminProductList.js
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "../api/axiosInstance";

/**
 * AdminProductList (debug-friendly full replacement)
 * - Tries axios relative endpoints first (respects axios.defaults.baseURL)
 * - Falls back to direct fetch to https://api.seemati.in/api/products
 * - Prints verbose console logs prefixed with [AdminProductList]
 * - Keeps your existing UI: Edit/Delete/Preview etc.
 */

export default function AdminProductList() {
  const [products, setProducts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMsg, setActionMsg] = useState("");
  const navigate = useNavigate();

  // Direct backend fallback (bypass Vercel rewrite) — used only for debugging
  const BACKEND_FALLBACK_BASE = "https://api.seemati.in/api";

  useEffect(() => {
    let cancelled = false;

    async function fetchProducts() {
      console.log("[AdminProductList] Starting fetchProducts");
      setLoading(true);
      setError(null);

      // token keys to try (after OTP login)
      const token =
        (typeof window !== "undefined" && localStorage.getItem("token")) ||
        (typeof window !== "undefined" && localStorage.getItem("authToken")) ||
        null;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Determine axios base to avoid double '/api'
      let base = "";
      try {
        base = (axios && axios.defaults && axios.defaults.baseURL) || "";
      } catch (e) {
        base = "";
      }
      const baseHasApi = typeof base === "string" && /\/api\/?$/.test(base);
      console.log("[AdminProductList] axios.defaults.baseURL:", base, "baseHasApi:", baseHasApi);

      // Candidate endpoints (relative) — we try multiple shapes to be safe
      const endpoints = baseHasApi
        ? ["/products", "/admin/products", "/products?page=1&limit=200"]
        : ["/api/products", "/api/admin/products", "/api/products?page=1&limit=200"];

      // Try each endpoint using axios (respects baseURL)
      for (const ep of endpoints) {
        try {
          console.log("[AdminProductList] Trying axios GET", ep);
          const res = await axios.get(ep, { headers });
          console.log("[AdminProductList] axios response for", ep, "status:", res && res.status, "data:", res && res.data);
          if (res && (res.status === 200 || res.data)) {
            const data = res.data;
            const list =
              Array.isArray(data)
                ? data
                : Array.isArray(data?.products)
                ? data.products
                : Array.isArray(data?.data)
                ? data.data
                : [];
            if (!cancelled) {
              setProducts(list);
              setLoading(false);
              console.log("[AdminProductList] Products set from axios:", list.length);
            }
            return;
          }
        } catch (err) {
          console.warn("[AdminProductList] axios GET failed for", ep, err && err.message ? err.message : err);
          // continue to next endpoint
        }
      }

      // Fallback: try direct fetch to backend domain (bypasses Vercel rewrite; helpful to detect rewrite/CORS issues)
      try {
        const url = `${BACKEND_FALLBACK_BASE}/products`;
        console.log("[AdminProductList] Attempting fallback fetch to", url);
        const resp = await fetch(url, {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
        });
        console.log("[AdminProductList] fallback fetch status:", resp.status, resp.statusText);
        if (!resp.ok) {
          const txt = await resp.text().catch(() => null);
          throw new Error(`Fallback fetch failed: ${resp.status} ${txt || resp.statusText}`);
        }
        const json = await resp.json().catch((e) => {
          throw new Error("Fallback fetch JSON parse failed: " + (e && e.message));
        });
        console.log("[AdminProductList] fallback fetch json:", json);
        const list =
          Array.isArray(json)
            ? json
            : Array.isArray(json?.products)
            ? json.products
            : Array.isArray(json?.data)
            ? json.data
            : [];
        if (!cancelled) {
          setProducts(list);
          setLoading(false);
          console.log("[AdminProductList] Products set from fallback fetch:", list.length);
        }
        return;
      } catch (fbErr) {
        console.error("[AdminProductList] fallback fetch failed:", fbErr && fbErr.message ? fbErr.message : fbErr);
        if (!cancelled) {
          setError(fbErr && fbErr.message ? fbErr.message : "Unable to load products");
          setLoading(false);
        }
      }
    }

    fetchProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  // Helpers (kept from your previous file)
  function pickThumbnail(p) {
    if (!p) return null;
    if (p.thumbnail) return p.thumbnail;
    if (p.image) return p.image;
    if (p.images && p.images.length) {
      const first = p.images[0];
      if (!first) return null;
      if (typeof first === "string") return first;
      return first.url || first.path || first.src || null;
    }
    return null;
  }
  function pickStock(p) {
    return p?.stock ?? p?.qty ?? p?.inventory ?? p?.quantity ?? p?.available ?? "-";
  }

  // delete with optimistic UI (kept)
  async function handleDelete(id) {
    const ok = window.confirm("Delete this product? This action cannot be undone.");
    if (!ok) return;
    const prev = products || [];
    setProducts(prev.filter((x) => (x._id || x.id) !== id));
    setActionMsg("Deleting...");
    try {
      const possible = [`/api/products/${id}`, `/api/admin/products/${id}`, `/products/${id}`, `/admin/products/${id}`];
      let deleted = false;
      for (const ep of possible) {
        try {
          const r = await axios.delete(ep);
          if (r && (r.status === 200 || r.status === 204 || (r.data && r.data.success))) {
            deleted = true;
            break;
          }
        } catch (err) {
          console.warn("[AdminProductList] delete attempt failed for", ep, err && err.message);
        }
      }
      if (!deleted) {
        const resp = await fetch(`/api/products/${id}`, { method: "DELETE", credentials: "include" });
        if (!resp.ok) throw new Error(`Delete failed ${resp.status}`);
      }
      setActionMsg("Deleted");
      setTimeout(() => setActionMsg(""), 1200);
      console.log("[AdminProductList] Deleted product", id);
    } catch (err) {
      setActionMsg(`Delete failed: ${err?.message || "unknown"}`);
      setProducts(prev);
      setTimeout(() => setActionMsg(""), 2500);
      console.error("[AdminProductList] delete error:", err);
    }
  }

  // Render states
  if (loading) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Admin — Products</h2>
        <p>Loading products… (open DevTools → Console to see [AdminProductList] logs)</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Admin — Products</h2>
        <div style={{ color: "crimson" }}>Error loading products: {String(error)}</div>
        <div style={{ marginTop: 10 }}>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Admin — Products</h2>
        <p>No products returned from API.</p>
        <p>
          <Link to="/admin/products/new">
            <button>+ Add product</button>
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Admin — Products ({products.length})</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <Link to="/admin/products/new">
            <button style={{ padding: "8px 12px" }}>+ Add product</button>
          </Link>
          <button onClick={() => window.location.reload()}>Refresh</button>
        </div>
      </div>

      {actionMsg && <div style={{ marginTop: 12 }}>{actionMsg}</div>}

      <div style={{ overflowX: "auto", marginTop: 16 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #eee", textAlign: "left" }}>
              <th style={{ padding: 10 }}>#</th>
              <th style={{ padding: 10 }}>SKU</th>
              <th style={{ padding: 10 }}>Thumbnail</th>
              <th style={{ padding: 10 }}>Name / Slug</th>
              <th style={{ padding: 10 }}>Category</th>
              <th style={{ padding: 10 }}>Price</th>
              <th style={{ padding: 10 }}>Stock</th>
              <th style={{ padding: 10 }}>Published</th>
              <th style={{ padding: 10 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, idx) => {
              const id = p._id || p.id || p.slug || idx;
              const thumb = pickThumbnail(p);
              return (
                <tr key={id} style={{ borderBottom: "1px solid #f3f3f3" }}>
                  <td style={{ padding: 10 }}>{idx + 1}</td>
                  <td style={{ padding: 10, width: 120 }}>{p.sku || p.code || "-"}</td>
                  <td style={{ padding: 10, width: 94 }}>
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={p.title || p.name}
                        style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 6 }}
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                    ) : (
                      <div
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 6,
                          background: "#fafafa",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#999",
                          fontSize: 12,
                        }}
                      >
                        no image
                      </div>
                    )}
                  </td>
                  <td style={{ padding: 10, minWidth: 220 }}>
                    <div style={{ fontWeight: 700 }}>{p.title || p.name || "-"}</div>
                    <div style={{ color: "#666", fontSize: 13 }}>{p.slug || "-"}</div>
                  </td>
                  <td style={{ padding: 10 }}>{p.category || p.cat || "-"}</td>
                  <td style={{ padding: 10 }}>{p.price ?? p.mrp ?? "-"}</td>
                  <td style={{ padding: 10 }}>{pickStock(p)}</td>
                  <td style={{ padding: 10 }}>{p.published ? "Yes" : "No"}</td>
                  <td style={{ padding: 10 }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Link to={`/admin/products/${id}`}>
                        <button style={{ padding: "6px 10px" }}>Edit</button>
                      </Link>
                      <button onClick={() => handleDelete(id)} style={{ padding: "6px 10px" }}>
                        Delete
                      </button>
                      <button
                        onClick={() => {
                          const slug = p.slug || p._id || p.id;
                          if (slug) window.open(`/product/${slug}`, "_blank");
                          else alert("No slug available");
                        }}
                        style={{ padding: "6px 10px" }}
                      >
                        Preview
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
