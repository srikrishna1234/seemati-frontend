// src/admin/ProductList.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";

export default function ProductList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const res = await axiosInstance.get(
          "/api/admin/products/products"
        );

        if (!cancelled) {
          setItems(Array.isArray(res.data) ? res.data : []);
        }
      } catch (e) {
        console.error("ProductList load error:", e);
        if (!cancelled) setErr("Failed to load products");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <div style={{ padding: 16 }}>Loading...</div>;
  if (err) return <div style={{ padding: 16, color: "crimson" }}>{err}</div>;

  return (
    <div style={{ padding: 16 }}>
      <h2>Products</h2>

      <Link to="/admin/products/add">
        <button>Add product</button>
      </Link>

      <table style={{ width: "100%", marginTop: 12, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #ddd" }}>
            <th style={{ padding: 8 }}>Title</th>
            <th style={{ padding: 8 }}>Price</th>
            <th style={{ padding: 8 }}>Stock</th>
            <th style={{ padding: 8 }}>Category</th>
            <th style={{ padding: 8 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map(p => (
            <tr key={p._id} style={{ borderBottom: "1px solid #f1f1f1" }}>
              <td style={{ padding: 8 }}>{p.title}</td>
              <td style={{ padding: 8 }}>₹{p.price}</td>
              <td style={{ padding: 8 }}>{p.stock ?? "—"}</td>
              <td style={{ padding: 8 }}>{p.category ?? "—"}</td>
              <td style={{ padding: 8 }}>
                <Link to={`/admin/products/${p._id}`}>View</Link>{" "}
                |{" "}
                <Link to={`/admin/products/edit/${p._id}`}>Edit</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
