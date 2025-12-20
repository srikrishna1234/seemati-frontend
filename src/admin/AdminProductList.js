// src/admin/AdminProductList.js
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "../api/axiosInstance";

/**
 * AdminProductList – CLEAN & FIXED VERSION
 * - DELETE now uses ONLY the correct endpoint: /api/products/:id
 * - No more retry on wrong routes (/api/admin/products/... etc)
 * - Product deletion will persist and NOT reappear
 */

export default function AdminProductList() {
  const [products, setProducts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMsg, setActionMsg] = useState("");
  const navigate = useNavigate();

  const BACKEND_FALLBACK_BASE = "https://api.seemati.in/api";

  useEffect(() => {
    let cancelled = false;

    async function fetchProducts() {
      setLoading(true);
      setError(null);

      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        null;

      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      try {
        const res = await axios.get("/products", { headers });

        const list =
          Array.isArray(res.data?.products)
            ? res.data.products
            : Array.isArray(res.data)
            ? res.data
            : [];

        if (!cancelled) {
          setProducts(list);
          setLoading(false);
        }
        return;
      } catch (err) {
        console.warn("Primary product load failed, trying fallback", err);
      }

      // Fallback fetch
      try {
        const resp = await fetch(`${BACKEND_FALLBACK_BASE}/products`);
        const json = await resp.json();
        const list =
          Array.isArray(json?.products)
            ? json.products
            : Array.isArray(json)
            ? json
            : [];

        if (!cancelled) {
          setProducts(list);
          setLoading(false);
        }
      } catch (fbErr) {
        if (!cancelled) {
          setError("Unable to load products");
          setLoading(false);
        }
      }
    }

    fetchProducts();
    return () => {
      cancelled = true;
    };
  }, []);

  function pickThumbnail(p) {
    if (!p) return null;
    if (p.thumbnail) return p.thumbnail;
    if (p.image) return p.image;
    if (p.images && p.images.length) {
      const first = p.images[0];
      return typeof first === "string" ? first : first.url || null;
    }
    return null;
  }

  function pickStock(p) {
    return p?.stock ?? p?.qty ?? p?.inventory ?? p?.quantity ?? "-";
  }

  // ⭐ FIXED DELETE FUNCTION
  async function handleDelete(id) {
    const ok = window.confirm("Delete this product? This action cannot be undone.");
    if (!ok) return;

    const prev = products;
    setProducts(prev.filter((p) => (p._id || p.id) !== id));
    setActionMsg("Deleting...");

    try {
      const res = await axios.delete(`/products/${id}`);

      if (!res.data?.success) {
        throw new Error(res.data?.message || "Delete failed");
      }

      setActionMsg("Deleted");
      setTimeout(() => setActionMsg(""), 1500);
    } catch (err) {
      console.error("Delete error", err);
      setProducts(prev);
      setActionMsg("Delete failed: " + (err.message || ""));
      setTimeout(() => setActionMsg(""), 2000);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Admin — Products</h2>
        <p>Loading products…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Admin — Products</h2>
        <div style={{ color: "crimson" }}>{error}</div>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Admin — Products</h2>
        <p>No products found.</p>
        <Link to="/admin/products/new"><button>+ Add product</button></Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h2>Admin — Products ({products.length})</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <Link to="/admin/products/new">
            <button>+ Add product</button>
          </Link>
          <button onClick={() => window.location.reload()}>Refresh</button>
        </div>
      </div>

      {actionMsg && <div style={{ marginTop: 12 }}>{actionMsg}</div>}

      <div style={{ overflowX: "auto", marginTop: 16 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #eee", textAlign: "left" }}>
              <th>#</th>
              <th>SKU</th>
              <th>Thumbnail</th>
              <th>Name / Slug</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {products.map((p, idx) => {
              const id = p._id || p.id || p.slug;
              const thumb = pickThumbnail(p);

              return (
                <tr key={id} style={{ borderBottom: "1px solid #eee" }}>
                  <td>{idx + 1}</td>
                  <td>{p.sku || "-"}</td>
                  <td>
                    {thumb ? (
                      <img src={thumb} style={{ width: 64, height: 64, borderRadius: 4, objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: 64, height: 64, background: "#eee", borderRadius: 4 }} />
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{p.title}</div>
                    <div>{p.slug}</div>
                  </td>
                  <td>{p.category || "-"}</td>
                  <td>{p.price ?? "-"}</td>
                  <td>{pickStock(p)}</td>
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Link to={`/admin/products/${id}`}>
                        <button>Edit</button>
                      </Link>

                      <button onClick={() => handleDelete(id)}>Delete</button>

                      <button
                        onClick={() => window.open(`/product/${p.slug}`, "_blank")}
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
