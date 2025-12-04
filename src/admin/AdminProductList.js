// src/admin/AdminProductList.js
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";

/**
 * AdminProductList
 * - Uses axiosInstance and calls /products (backend exposes /products)
 * - Shows thumbnail, sku, title + subtitle, category, price, mrp, stock, colors, sizes, published
 * - Edit button => /admin/products/:id
 * - Delete button => DELETE /products/:id (confirm)
 * - Search + client-side pagination
 */

const PAGE_SIZE = 10;

export default function AdminProductList() {
  const [items, setItems] = useState(null); // null = loading
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        console.debug("[AdminProductList] requesting GET /products via axiosInstance");
        const res = await axiosInstance.get("/products");
        const data = res && res.data ? res.data : null;
        const arr = Array.isArray(data) ? data : data?.products || data?.docs || data?.items || [];
        console.debug("[AdminProductList] loaded", (arr && arr.length) || 0);
        if (!cancelled) setItems(arr || []);
      } catch (err) {
        console.error("[AdminProductList] load error", err && (err.message || err));
        if (!cancelled) {
          setError("Unable to load products. See console for details.");
          setItems([]);
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

  // delete action
  const handleDelete = async (id) => {
    if (!id) return;
    if (!window.confirm("Delete this product? This action cannot be undone.")) return;
    try {
      // backend expects DELETE /products/:id
      await axiosInstance.delete(`/products/${id}`);
      setItems((prev) => (prev || []).filter((p) => (p._id || p.id) !== id));
    } catch (err) {
      console.error("Delete failed", err);
      alert("Delete failed. See console for details.");
    }
  };

  // helpers to normalize fields
  const normalizeImages = (p) => {
    if (!p) return [];
    if (Array.isArray(p.images)) {
      return p.images.map((it) => (typeof it === "string" ? it : it.url || it.key || "")).filter(Boolean);
    }
    if (p.thumbnail) return [p.thumbnail];
    return [];
  };
  const normalizeColors = (p) => {
    if (!p) return [];
    if (Array.isArray(p.colors)) return p.colors;
    if (typeof p.colors === "string") {
      return p.colors.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [];
  };
  const normalizeSizes = (p) => {
    if (!p) return [];
    if (Array.isArray(p.sizes)) return p.sizes;
    if (typeof p.sizes === "string") {
      return p.sizes.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [];
  };

  // search filter
  const filtered = useMemo(() => {
    if (!items) return [];
    if (!query) return items;
    const q = query.trim().toLowerCase();
    return items.filter((p) => {
      const title = (p.title || p.name || p.slug || "").toString().toLowerCase();
      const sku = (p.sku || p.code || "").toString().toLowerCase();
      const cat = (p.category || "").toString().toLowerCase();
      const desc = (p.description || "").toString().toLowerCase();
      return title.includes(q) || sku.includes(q) || cat.includes(q) || desc.includes(q);
    });
  }, [items, query]);

  const totalPages = Math.max(1, Math.ceil((filtered || []).length / PAGE_SIZE));
  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return (filtered || []).slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const gotoPage = (p) => {
    const clamped = Math.max(1, Math.min(totalPages, p));
    setPage(clamped);
    window.scrollTo({ top: 200, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Admin — Products</h2>
        <div>Loading products…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Admin — Products</h2>
        <div style={{ color: "red" }}>{error}</div>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Admin — Products</h2>
        <div>No products found.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Admin — Products ({items.length})</h2>

      {/* Controls */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <input
          placeholder="Search by name, SKU or category"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          style={{ padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, minWidth: 300 }}
        />
        <button
          onClick={() => {
            setQuery("");
            setPage(1);
          }}
          style={{ padding: "8px 10px" }}
        >
          Clear
        </button>

        <div style={{ marginLeft: "auto" }}>
          <Link to="/admin/products/add">
            <button style={{ padding: "8px 12px", background: "#0b74de", color: "#fff", border: "none", borderRadius: 6 }}>
              + Add product
            </button>
          </Link>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Thumb</th>
              <th style={th}>SKU</th>
              <th style={th}>Name</th>
              <th style={th}>Category</th>
              <th style={th}>Price</th>
              <th style={th}>MRP</th>
              <th style={th}>Stock</th>
              <th style={th}>Colors</th>
              <th style={th}>Sizes</th>
              <th style={th}>Published</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {pageItems.map((p) => {
              const id = p._id || p.id || p.slug || `${Math.random()}`;
              const images = normalizeImages(p);
              const colors = normalizeColors(p);
              const sizes = normalizeSizes(p);
              const thumb = images[0] || "";
              const subtitle = (p.subtitle || (colors && colors[0]) || "").toString();

              return (
                <tr key={id}>
                  <td style={td}>
                    {thumb ? (
                      // show small thumbnail
                      <img src={thumb} alt={p.title || "thumb"} style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6 }} />
                    ) : (
                      <div style={{ width: 56, height: 56, background: "#f5f5f5", borderRadius: 6 }} />
                    )}
                  </td>

                  <td style={td}>{p.sku || p.code || "-"}</td>

                  <td style={td}>
                    <div style={{ fontWeight: 700 }}>{p.title || p.name || "-"}</div>
                    {subtitle ? <div style={{ fontSize: 12, color: "#666" }}>{subtitle}</div> : null}
                  </td>

                  <td style={td}>{p.category || "-"}</td>
                  <td style={td}>{p.price != null ? p.price : "-"}</td>
                  <td style={td}>{p.mrp != null ? p.mrp : "-"}</td>
                  <td style={td}>{p.stock != null ? p.stock : "-"}</td>
                  <td style={td}>{colors.length}</td>
                  <td style={td}>{sizes.length}</td>
                  <td style={td}>{p.isPublished ? "Yes" : "No"}</td>

                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    <button
                      onClick={() => navigate(`/admin/products/${id}`)}
                      style={{ ...actionBtn, marginRight: 8 }}
                      title="Edit"
                    >
                      Edit
                    </button>

                    <button onClick={() => handleDelete(id)} style={{ ...actionBtn, background: "#e11", color: "#fff" }} title="Delete">
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16, alignItems: "center" }}>
        <button onClick={() => gotoPage(page - 1)} disabled={page === 1} style={pagerBtn}>
          Prev
        </button>
        <div>
          Page {page} of {totalPages}
        </div>
        <button onClick={() => gotoPage(page + 1)} disabled={page === totalPages} style={pagerBtn}>
          Next
        </button>
      </div>
    </div>
  );
}

// styles
const th = { textAlign: "left", padding: "10px 12px", borderBottom: "1px solid #eee", fontWeight: 700 };
const td = { padding: "10px 12px", borderBottom: "1px solid #fafafa", verticalAlign: "middle" };
const actionBtn = { padding: "6px 8px", borderRadius: 6, border: "1px solid #ddd", background: "#fff", cursor: "pointer" };
const pagerBtn = { padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", background: "#fff" };
