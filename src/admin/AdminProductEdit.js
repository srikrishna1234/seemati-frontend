// frontend/src/admin/AdminProductEdit.js
import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "../api/axiosInstance";

export default function AdminProductEdit() {
  const { id } = useParams(); // expects route like /admin/products/edit/:id
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function fetchProduct() {
      try {
        setLoading(true);
        setError(null);

        // IMPORTANT: call backend at /api/products/:id
        const res = await axios.get(`/api/products/${id}`);
        if (!mounted) return;
        // backend might return { ok: true, product: {...} } or return product directly
        const p = res.data && (res.data.product || res.data);
        setProduct(p);
      } catch (err) {
        console.error("AdminProductEdit fetch error:", err);
        if (!mounted) return;
        // attach a friendly message
        if (err.response && err.response.status === 404) {
          setError({ code: 404, message: "Product not found (404)." });
        } else if (err.response) {
          setError({ code: err.response.status, message: err.response.data?.message || "Server error" });
        } else {
          setError({ code: 0, message: err.message || "Network error" });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchProduct();
    return () => (mounted = false);
  }, [id]);

  const handleBack = () => navigate("/admin/products");

  if (loading) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Loading product…</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 20 }}>
        <h2 style={{ color: "red" }}>Error: {error.message}</h2>
        <p>
          <Link to="/admin/products">Back to products</Link>
        </p>
        <pre style={{ background: "#f8f8f8", padding: 12 }}>{error.code ? `Status ${error.code}` : ""}</pre>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ padding: 20 }}>
        <h2>No product data</h2>
        <p>
          <Link to="/admin/products">Back to products</Link>
        </p>
      </div>
    );
  }

  // Simple read-only view (you can replace with your edit form)
  return (
    <div style={{ padding: 20 }}>
      <h2>Edit product — {product.title || product.name || product.slug}</h2>
      <button onClick={handleBack} style={{ marginBottom: 12 }}>
        Back to products
      </button>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>
        <div>
          {product.images && product.images.length > 0 ? (
            <img
              src={product.images[0].url || product.images[0]}
              alt={product.title || "product"}
              style={{ width: "100%", objectFit: "contain", borderRadius: 6 }}
            />
          ) : (
            <div style={{ width: "100%", height: 200, background: "#f4f4f4" }} />
          )}
        </div>

        <div>
          <p><strong>Title:</strong> {product.title || "—"}</p>
          <p><strong>Slug:</strong> {product.slug || "—"}</p>
          <p><strong>Price:</strong> ₹{product.price != null ? product.price : "—"}</p>
          <p><strong>Description:</strong></p>
          <div style={{ whiteSpace: "pre-wrap", background: "#fff", padding: 8, borderRadius: 4 }}>{product.description || "—"}</div>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <button onClick={() => navigate(`/admin/products/edit/${id}/form`)} style={{ marginRight: 8 }}>
          Open full edit form (if available)
        </button>
        <button onClick={handleBack}>Done</button>
      </div>
    </div>
  );
}
