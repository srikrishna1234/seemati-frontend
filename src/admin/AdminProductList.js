// frontend/src/admin/AdminProductList.js
import React, { useEffect, useState } from "react";
import axios from "../api/axiosInstance";
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
        // Request backend under /api
        const res = await axios.get("/api/products?page=1&limit=100&fields=_id,title,slug,price,thumbnail,images");
        const data = res.data;
        const list = Array.isArray(data.products) ? data.products : data;
        if (!mounted) return;
        setProducts(list);
      } catch (err) {
        console.error("Failed to fetch products:", err);
        if (mounted) setError(err);
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
      const ok = window.confirm("Are you sure you want to delete this product? This cannot be undone.");
      if (!ok) return;
      await axios.delete(`/api/products/${productId}`);
      setProducts((prev) => prev.filter((p) => (p._id || p.id) !== productId));
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete product. See console for details.");
    }
  };

  const goToEdit = (productId) => {
    navigate(`/admin/products/edit/${productId}`);
  };

  if (loading) return <div style={{ padding: 20 }}>Loading products…</div>;
  if (error) return <div style={{ padding: 20, color: "red" }}>Failed to fetch products: {error.message || String(error)}</div>;

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
              <th style={{ borderBottom: "1px solid #ddd", padding: 8, textAlign: "left" }}>Price</th>
              <th style={{ borderBottom: "1px solid #ddd", padding: 8, textAlign: "left" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const id = p._id || p.id || p.productId;
              const imageUrl = p.thumbnail || (p.images && p.images[0] && (p.images[0].url || p.images[0])) || "";
              return (
                <tr key={id}>
                  <td style={{ padding: 8, verticalAlign: "middle" }}>
                    {imageUrl ? (
                      <img src={imageUrl} alt={p.title || "product"} style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 4 }} />
                    ) : (
                      <div style={{ width: 60, height: 60, background: "#f4f4f4", borderRadius: 4 }} />
                    )}
                  </td>
                  <td style={{ padding: 8, verticalAlign: "middle" }}>{p.title || p.name || "—"}</td>
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
