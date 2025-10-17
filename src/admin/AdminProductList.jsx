// src/admin/AdminProductList.jsx
import React, { useEffect, useRef, useState } from "react";
import axios from "../api/axiosInstance";
import { Link } from "react-router-dom";

export default function AdminProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const mountedRef = useRef(false);
  const fetchOnceRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (fetchOnceRef.current) return;
    fetchOnceRef.current = true;

    const controller = new AbortController();
    let cancelled = false;
    const minLoadingMs = 180; // small delay to avoid flash

    async function load() {
      try {
        const t0 = Date.now();
        setLoading(true);
        setError(null);

        const res = await axios.get("/admin-api/products?page=1&limit=10", { signal: controller.signal });
        const data = res.data ?? res.data?.products ?? res.data;

        const took = Date.now() - t0;
        const wait = Math.max(0, minLoadingMs - took);
        if (wait) await new Promise(r => setTimeout(r, wait));

        if (cancelled) return;
        if (mountedRef.current) setProducts(Array.isArray(data) ? data : res.data);
      } catch (err) {
        if (err?.name === "AbortError" || err?.name === "CanceledError") return;
        console.error("AdminProductList fetch error:", err);
        if (!cancelled && mountedRef.current) setError(err.message || "Failed to load");
      } finally {
        if (!cancelled && mountedRef.current) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Products</h2>
        <Link to="/admin/products/new"><button style={{ padding: "8px 12px", borderRadius: 6 }}>Add product</button></Link>
      </div>

      {error && <div style={{ color: "crimson" }}>{error}</div>}

      <div
        style={{
          transition: "opacity 240ms ease, transform 240ms ease",
          opacity: loading ? 0.01 : 1,
          transform: loading ? "translateY(6px)" : "translateY(0)",
        }}
      >
        {!loading && !products.length && <div>No products found.</div>}

        {!loading && products.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #e6e6e6" }}>
                <th style={{ padding: 8 }}>#</th>
                <th style={{ padding: 8 }}>Image</th>
                <th style={{ padding: 8 }}>Title</th>
                <th style={{ padding: 8 }}>Slug</th>
                <th style={{ padding: 8 }}>Price</th>
                <th style={{ padding: 8 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, idx) => (
                <tr key={p._id || p.slug || idx} style={{ borderBottom: "1px solid #f3f3f3" }}>
                  <td style={{ padding: 8, verticalAlign: "top" }}>{idx + 1}</td>
                  <td style={{ padding: 8, verticalAlign: "top" }}>
                    <img src={(p.images && p.images[0] && (p.images[0].url || p.images[0])) ? (p.thumbnail || p.images[0].url) : `${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/uploads/placeholder.png`} alt={p.title} style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8 }} />
                  </td>
                  <td style={{ padding: 8, verticalAlign: "top" }}>{p.title}</td>
                  <td style={{ padding: 8, verticalAlign: "top" }}>{p.slug}</td>
                  <td style={{ padding: 8, verticalAlign: "top" }}>₹{(Number(p.price) || 0).toFixed(0)}</td>
                  <td style={{ padding: 8, verticalAlign: "top", display: "flex", gap: 8 }}>
                    <Link to={`/admin/products/edit/${p._id || p.slug}`}><button>Edit</button></Link>
                    <button onClick={() => { if (confirm("Delete?")) {/* implement delete */} }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
