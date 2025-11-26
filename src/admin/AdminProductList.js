// src/admin/AdminProductList.js
import React, { useEffect, useState } from "react";
import axios from "../api/axiosInstance"; // matches the axiosInstance you created
import { useNavigate } from "react-router-dom";

export default function AdminProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    async function fetchProducts() {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get("/products");
        if (mounted) {
          setProducts(Array.isArray(res.data) ? res.data : res.data.products || []);
        }
      } catch (err) {
        console.error("Failed to fetch products:", err);
        if (mounted) setError("Failed to load products");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchProducts();
    return () => {
      mounted = false;
    };
  }, []);

  const handleDelete = async (productId) => {
    try {
      // Use window.confirm to avoid the ESLint no-restricted-globals error
      const ok = window.confirm("Are you sure you want to delete this product? This cannot be undone.");
      if (!ok) return;

      await axios.delete(`/products/${productId}`);
      // Remove deleted product from state
      setProducts((prev) => prev.filter((p) => p._id !== productId && p.id !== productId));
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete product. Check console for details.");
    }
  };

  const goToEdit = (productId) => {
    // adjust path to your edit page if different
    navigate(`/admin/products/edit/${productId}`);
  };

  if (loading) {
    return <div style={{ padding: 20 }}>Loading products…</div>;
  }

  if (error) {
    return <div style={{ padding: 20, color: "red" }}>{error}</div>;
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2>Products</h2>
        <button onClick={() => navigate("/admin/products/new")}>Add Product</button>
      </div>

      {products.length === 0 ? (
        <div>No products found.</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ borderBottom: "1px solid #ddd", padding: 8, textAlign: "left" }}>Image</th>
              <th style={{ borderBottom: "1px solid #ddd", padding: 8, textAlign: "left" }}>Name</th>
              <th style={{ borderBottom: "1px solid #ddd", padding: 8, textAlign: "left" }}>SKU</th>
              <th style={{ borderBottom: "1px solid #ddd", padding: 8, textAlign: "left" }}>Price</th>
              <th style={{ borderBottom: "1px solid #ddd", padding: 8, textAlign: "left" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const id = p._id || p.id || p.productId;
              const imageUrl = p.image || (p.images && p.images[0]) || "";
              return (
                <tr key={id}>
                  <td style={{ padding: 8, verticalAlign: "middle" }}>
                    {imageUrl ? (
                      <img src={imageUrl} alt={p.name || "product"} style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 4 }} />
                    ) : (
                      <div style={{ width: 60, height: 60, background: "#f4f4f4", borderRadius: 4 }} />
                    )}
                  </td>
                  <td style={{ padding: 8, verticalAlign: "middle" }}>{p.name || "—"}</td>
                  <td style={{ padding: 8, verticalAlign: "middle" }}>{p.sku || p.SKU || "—"}</td>
                  <td style={{ padding: 8, verticalAlign: "middle" }}>{p.price != null ? `₹${p.price}` : "—"}</td>
                  <td style={{ padding: 8, verticalAlign: "middle" }}>
                    <button onClick={() => goToEdit(id)} style={{ marginRight: 8 }}>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(id)}>Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
