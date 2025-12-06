// src/admin/AdminProductList.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axiosInstance";

/**
 * AdminProductList
 * - Fetches /api/products
 * - Displays table with SKU, Name, Category, Price, Stock (if present), Thumbnail
 * - Edit button -> /admin/products/:id
 * - Add product button -> /admin/products/new
 * - Delete button -> calls DELETE /api/products/:id and refreshes list
 *
 * Full replacement file (drop into src/admin/AdminProductList.jsx)
 */

export default function AdminProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get("/api/products");
        // assume server returns { success: true, products: [...] } or { products: [...] }
        const list = res.data && (res.data.products || res.data.products === [] ? res.data.products : res.data);
        if (!cancelled) {
          setProducts(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        console.error("[AdminProductList] fetch error:", err);
        if (!cancelled) {
          setError(err.response && err.response.data ? err.response.data : err.message || "Failed to fetch products");
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

  async function handleDelete(id) {
    const ok = window.confirm("Delete product? This action cannot be undone.");
    if (!ok) return;
    setDeletingId(id);
    try {
      await api.delete(`/api/products/${id}`);
      // remove from list locally for instant feedback
      setProducts((prev) => prev.filter((p) => (p._id || p.id) !== id));
    } catch (err) {
      console.error("[AdminProductList] delete error:", err);
      alert("Delete failed: " + (err.response && err.response.data ? JSON.stringify(err.response.data) : err.message));
    } finally {
      setDeletingId(null);
    }
  }

  function toEdit(id) {
    // route used in your project appears to be /admin/products/:id for editing
    navigate(`/admin/products/${id}`);
  }

  function toAdd() {
    navigate(`/admin/products/new`);
  }

  return (
    <div style={{ padding: 12 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0 }}>Admin — Products {products ? `(${products.length})` : ""}</h1>
          <div style={{ color: "#666", marginTop: 6 }}>Manage product catalogue — add, edit or remove items.</div>
        </div>

        <div>
          <button
            onClick={toAdd}
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid #ddd",
              background: "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            + Add product
          </button>
        </div>
      </header>

      {loading ? (
        <div style={{ padding: 24, textAlign: "center" }}>Loading products…</div>
      ) : error ? (
        <div style={{ padding: 18, color: "#900", background: "#fbeaea", borderRadius: 6 }}>
          Error loading products: {typeof error === "string" ? error : JSON.stringify(error)}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "2px solid #eee" }}>
                <th style={{ padding: "10px 12px", width: 120 }}>SKU</th>
                <th style={{ padding: "10px 12px", width: 200 }}>Name</th>
                <th style={{ padding: "10px 12px", width: 140 }}>Category</th>
                <th style={{ padding: "10px 12px", width: 120 }}>Price</th>
                <th style={{ padding: "10px 12px", width: 120 }}>Stock</th>
                <th style={{ padding: "10px 12px", width: 120 }}>Thumbnail</th>
                <th style={{ padding: "10px 12px", width: 220 }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {products.map((p) => {
                const id = p._id || p.id;
                const sku = p.sku || p.SKU || "-";
                const name = p.title || p.name || p.name_en || p.title_en || "—";
                const category = (p.category && (p.category.name || p.category)) || p.category || "-";
                const price = p.price != null ? p.price : (p.mrp != null ? p.mrp : "-");
                const stock = p.stock != null ? p.stock : (p.qty != null ? p.qty : "-");
                const thumb = Array.isArray(p.images) && p.images.length ? (p.images[0].url || p.images[0]) : null;

                return (
                  <tr key={id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={{ padding: "10px 12px" }}>{sku}</td>
                    <td style={{ padding: "10px 12px" }}>{name}</td>
                    <td style={{ padding: "10px 12px" }}>{category}</td>
                    <td style={{ padding: "10px 12px" }}>{price}</td>
                    <td style={{ padding: "10px 12px" }}>{stock}</td>
                    <td style={{ padding: "8px 12px" }}>
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={name}
                          style={{ width: 70, height: 70, objectFit: "cover", borderRadius: 6, border: "1px solid #eee" }}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <div style={{ width: 70, height: 70, borderRadius: 6, background: "#fafafa", border: "1px solid #f0f0f0" }} />
                      )}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <button
                        onClick={() => toEdit(id)}
                        style={{
                          marginRight: 8,
                          padding: "6px 10px",
                          borderRadius: 6,
                          border: "1px solid #ccc",
                          background: "#fff",
                          cursor: "pointer",
                        }}
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDelete(id)}
                        disabled={deletingId === id}
                        style={{
                          marginRight: 8,
                          padding: "6px 10px",
                          borderRadius: 6,
                          border: "1px solid #e0b4b4",
                          background: deletingId === id ? "#f7dede" : "#fff",
                          color: "#900",
                          cursor: "pointer",
                        }}
                      >
                        {deletingId === id ? "Deleting…" : "Delete"}
                      </button>

                      <Link
                        to={`/admin/products/${id}`}
                        style={{
                          marginLeft: 6,
                          textDecoration: "none",
                          padding: "6px 10px",
                          borderRadius: 6,
                          border: "1px solid #ddd",
                          background: "#fff",
                          color: "#333",
                        }}
                      >
                        View
                      </Link>
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
