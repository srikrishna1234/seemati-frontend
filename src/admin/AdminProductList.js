// src/admin/AdminProductList.js
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "../api/axiosInstance";

/**
 * AdminProductList (single-file authoritative version)
 * - Shows SKU, thumbnail, name/title, slug, category, price, stock, published
 * - Edit, Delete, Preview, Add Product, Refresh actions
 * - Respects axios.defaults.baseURL to avoid double /api prefix
 * - Fallbacks to fetch() if needed
 */

export default function AdminProductList() {
  const [products, setProducts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMsg, setActionMsg] = useState("");
  const navigate = useNavigate();

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
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Inspect axios baseURL to avoid double '/api' prefix problems
      let base = "";
      try {
        base = (axios && axios.defaults && axios.defaults.baseURL) || "";
      } catch (e) {
        base = "";
      }
      const baseHasApi = typeof base === "string" && /\/api\/?$/.test(base);

      // endpoints to try (we avoid doubling /api if axios base already contains it)
      const endpoints = baseHasApi
        ? ["/products", "/admin/products", "/products?page=1&limit=200"]
        : ["/api/products", "/api/admin/products", "/api/products?page=1&limit=200"];

      // Try endpoints using axios (respects baseURL)
      for (const ep of endpoints) {
        try {
          const res = await axios.get(ep, { headers });
          if (res && (res.status === 200 || res.data)) {
            const data = res.data;
            const list = Array.isArray(data)
              ? data
              : Array.isArray(data?.products)
              ? data.products
              : Array.isArray(data?.data)
              ? data.data
              : [];
            if (!cancelled) setProducts(list);
            setLoading(false);
            return;
          }
        } catch (e) {
          // continue to next endpoint
        }
      }

      // Fallback to fetch('/api/products') — matches local dev or proxied setups
      try {
        const fetchResp = await fetch("/api/products", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
          credentials: "include",
        });
        if (!fetchResp.ok) {
          const txt = await fetchResp.text().catch(() => null);
          throw new Error(`Fetch failed: ${fetchResp.status} ${txt || fetchResp.statusText}`);
        }
        const json = await fetchResp.json();
        const list = Array.isArray(json)
          ? json
          : Array.isArray(json?.products)
          ? json.products
          : Array.isArray(json?.data)
          ? json.data
          : [];
        if (!cancelled) setProducts(list);
        setLoading(false);
        return;
      } catch (fetchErr) {
        if (!cancelled) {
          setError(fetchErr.message || "Unable to load products");
          setLoading(false);
        }
      }
    }

    fetchProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  // small helpers
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

  // delete with optimistic UI
  async function handleDelete(id) {
    const ok = window.confirm("Delete this product? This action cannot be undone.");
    if (!ok) return;
    const prev = products;
    setProducts(prev.filter((x) => (x._id || x.id) !== id));
    setActionMsg("Deleting...");
    try {
      // prefer axios delete against API
      const possible = [`/api/products/${id}`, `/api/admin/products/${id}`, `/products/${id}`, `/admin/products/${id}`];
      let deleted = false;
      let lastErr = null;
      for (const ep of possible) {
        try {
          const r = await axios.delete(ep);
          if (r && (r.status === 200 || r.status === 204 || (r.data && r.data.success))) {
            deleted = true;
            break;
          }
        } catch (err) {
          lastErr = err;
        }
      }
      if (!deleted) {
        // fallback to fetch delete
        const resp = await fetch(`/api/products/${id}`, { method: "DELETE", credentials: "include" });
        if (!resp.ok) throw new Error(`Delete failed ${resp.status}`);
      }
      setActionMsg("Deleted");
      setTimeout(() => setActionMsg(""), 1200);
    } catch (err) {
      setActionMsg(`Delete failed: ${err?.message || "unknown"}`);
      setProducts(prev);
      setTimeout(() => setActionMsg(""), 2500);
    }
  }

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
                      <div style={{ width: 64, height: 64, borderRadius: 6, background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 12 }}>
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
                      <button onClick={() => handleDelete(id)} style={{ padding: "6px 10px" }}>Delete</button>
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
