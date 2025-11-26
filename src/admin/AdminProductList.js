// src/admin/AdminProductList.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axiosInstance";

/**
 * AdminProductList
 * Full replacement file. Fetches products from the API and renders a simple table.
 *
 * Behavior:
 * - Uses api (axios instance) already present in your project.
 * - Fetches the same endpoint you used in the console.
 * - Expects response shape: { ok:true, page, limit, total, products: [...] }
 * - Renders an image thumbnail, title, slug, price and simple actions.
 */

export default function AdminProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function loadProducts() {
    setLoading(true);
    setError(null);
    try {
      const url =
        "/products?page=1&limit=100&fields=title,price,mrp,compareAtPrice,slug,thumbnail,images,description";
      // Note: axios instance (api) should already point to baseURL https://api.seemati.in/api
      const res = await api.get(url, { withCredentials: true });
      // defensive: accept either { data: { products: [...] } } or direct array
      const payload = res && res.data ? res.data : {};
      const list = Array.isArray(payload.products) ? payload.products : [];
      setProducts(list);
    } catch (err) {
      console.error("AdminProductList load error:", err);
      setError(err?.response?.data?.message || err.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goEdit(id) {
    navigate(`/admin/products/${id}/edit`);
  }

  async function handleDelete(id) {
    if (!confirm("Delete product? This cannot be undone.")) return;
    try {
      await api.delete(`/products/${id}`, { withCredentials: true });
      // remove locally
      setProducts((p) => p.filter((it) => it._id !== id));
    } catch (err) {
      alert("Delete failed: " + (err?.response?.data?.message || err.message));
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Admin — Products</h1>
      <p>
        <Link to="/admin/products/new">Add product</Link>
      </p>

      {loading ? (
        <p>Loading products…</p>
      ) : error ? (
        <div style={{ color: "darkred" }}>
          <strong>Error:</strong> {String(error)}
        </div>
      ) : !products || products.length === 0 ? (
        <div>No products found.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "2px solid #eee" }}>
                <th style={{ padding: "8px 12px" }}>Image</th>
                <th style={{ padding: "8px 12px" }}>Title</th>
                <th style={{ padding: "8px 12px" }}>Slug / SKU</th>
                <th style={{ padding: "8px 12px" }}>Price</th>
                <th style={{ padding: "8px 12px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const thumb =
                  (p.thumbnail && p.thumbnail.url) ||
                  (Array.isArray(p.images) && p.images[0] && p.images[0].url) ||
                  "";
                return (
                  <tr key={p._id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={{ padding: "8px 12px", width: 120 }}>
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={p.title || p.slug || "product"}
                          style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 6 }}
                        />
                      ) : (
                        <div style={{ width: 80, height: 80, background: "#fafafa", borderRadius: 6 }} />
                      )}
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <div style={{ fontWeight: 700 }}>{p.title || "(no title)"}</div>
                      <div style={{ color: "#666", fontSize: 13 }}>{p.description || ""}</div>
                    </td>
                    <td style={{ padding: "8px 12px" }}>{p.slug || p.sku || "-"}</td>
                    <td style={{ padding: "8px 12px" }}>
                      ₹{Number(p.price || 0).toLocaleString()}
                      {p.mrp ? <div style={{ fontSize: 12, color: "#999" }}>MRP: ₹{p.mrp}</div> : null}
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <button onClick={() => goEdit(p._id)} style={{ marginRight: 8 }}>
                        Edit
                      </button>
                      <button onClick={() => handleDelete(p._id)} style={{ background: "#ef4444", color: "#fff" }}>
                        Delete
                      </button>
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
