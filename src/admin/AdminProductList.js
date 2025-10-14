// src/admin/AdminProductList.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosInstance"; // our axios instance
const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:4000";

export default function AdminProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  // Ensure image url becomes absolute
  function absImageUrl(url) {
    if (!url) return null;
    const s = String(url);
    if (s.startsWith("http://") || s.startsWith("https://")) return s;
    if (s.startsWith("/")) return `${API_BASE}${s}`;
    return `${API_BASE}/${s}`;
  }

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // call the admin product endpoint
        const resp = await api.get("/admin-api/products");
        if (!mounted) return;
        // handle array or wrapped object
        const data = Array.isArray(resp.data) ? resp.data : (resp.data?.products || resp.data?.data || []);
        setProducts(data || []);
      } catch (err) {
        console.error("Failed to load products", err);
        const msg = err?.response?.data?.message || err.message || "Failed to load products";
        setError(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  function handleEdit(id) {
    navigate(`/admin/products/edit/${id}`);
  }

  // client-side filtering
  const filtered = products.filter((p) => {
    if (!query) return true;
    const q = query.toLowerCase();
    const title = String(p.title || p.name || "").toLowerCase();
    const category = String(p.category || "").toLowerCase();
    return title.includes(q) || category.includes(q);
  });

  if (loading) return <div>Loading products...</div>;
  if (error) return <div style={{ color: "crimson" }}>Error: {String(error)}</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22 }}>Admin — Products ({products.length})</h2>
          <div style={{ marginTop: 6, color: "#666", fontSize: 13 }}>
            Manage products — search, edit or add new items
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="text"
            placeholder="Search by title or category"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              padding: "8px 10px",
              borderRadius: 6,
              border: "1px solid #ddd",
              minWidth: 220,
            }}
          />
          <button
            onClick={() => navigate("/admin/products/add")}
            style={{
              background: "#16a34a",
              color: "#fff",
              border: "none",
              padding: "10px 14px",
              borderRadius: 6,
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
          >
            + Add Product
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div>No products found.</div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16
        }}>
          {filtered.map((p) => (
            <div key={p._id} style={{
              border: "1px solid #e6e6e6",
              borderRadius: 8,
              padding: 12,
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
            }}>
              <div style={{ height: 160, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {p.images && p.images.length > 0 ? (
                  <img
                    src={absImageUrl(p.images[0].url)}
                    alt={p.title}
                    style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div style={{ color: "#888" }}>No image</div>
                )}
              </div>

              <div style={{ fontWeight: 600 }}>{p.title || p.name || "Untitled"}</div>
              <div style={{ color: "#555", fontSize: 14, marginTop: 6 }}>
                ₹{p.price ?? p.mrp ?? "—"} {p.deleted ? <span style={{color:'crimson', marginLeft:8}}>deleted</span> : null}
              </div>
              <div style={{ marginTop: 8, fontSize: 13, color: "#666" }}>
                Category: {p.category || "—"}
              </div>
              <div style={{ marginTop: 8 }}>
                <button style={{ padding: "6px 8px" }} onClick={() => handleEdit(p._id)}>Edit</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
