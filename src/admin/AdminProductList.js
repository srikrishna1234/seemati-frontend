// src/admin/AdminProductList.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../api/axiosInstance";

/*
  AdminProductList (improved)
  - Uses absolute navigation to avoid repeated relative paths
  - Accepts multiple API response shapes
  - Shows loading, error and empty states
  - Keeps image fallback and delete action
*/

export default function AdminProductList() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function fetchProducts() {
      try {
        setLoading(true);
        setError(null);

        // Adjust endpoint if your backend admin route differs.
        // This expects the public API that returns either an array or { products: [] }.
        const res = await axios.get("/api/products?page=1&limit=200&fields=_id,title,slug,price,thumbnail,images,stock,category");
        const data = res?.data;

        // Normalize product list:
        let list = [];
        if (Array.isArray(data)) list = data;
        else if (Array.isArray(data?.products)) list = data.products;
        else if (Array.isArray(data?.data)) list = data.data;
        else if (Array.isArray(data?.rows)) list = data.rows;
        else list = [];

        if (!mounted) return;
        setProducts(list);
      } catch (err) {
        console.error("AdminProductList: fetch failed", err);
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

      // call delete API (adjust path if your backend expects /admin/products)
      await axios.delete(`/api/products/${productId}`);
      setProducts((prev) => prev.filter((p) => (p._id || p.id) !== productId));
    } catch (err) {
      console.error("AdminProductList: delete failed", err);
      alert("Delete failed — see console for details.");
    }
  };

  const goToEdit = (productId) => {
    // absolute path prevents relative append issues
    navigate(`/admin/products/edit/${productId}`);
  };

  const goToNew = () => {
    navigate("/admin/products/new");
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Products</h2>
        <button onClick={goToNew} style={{ padding: "6px 10px" }}>
          Add product
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 12 }}>Loading products…</div>
      ) : error ? (
        <div style={{ padding: 12, color: "red" }}>Failed to load products. Check console for details.</div>
      ) : products.length === 0 ? (
        <div style={{ padding: 12, color: "#444" }}>No products found.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                <th style={{ padding: "8px" }}>Image</th>
                <th style={{ padding: "8px" }}>Title</th>
                <th style={{ padding: "8px" }}>Price</th>
                <th style={{ padding: "8px" }}>Stock</th>
                <th style={{ padding: "8px" }}>Category</th>
                <th style={{ padding: "8px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const id = p._id || p.id || p.slug || JSON.stringify(p).slice(0, 8);
                const imageUrl =
                  p.thumbnail ||
                  (Array.isArray(p.images) && (p.images[0]?.url || p.images[0])) ||
                  (typeof p.images === "string" ? p.images : "");
                return (
                  <tr key={id} style={{ borderBottom: "1px solid #f6f6f6" }}>
                    <td style={{ padding: 8, verticalAlign: "middle" }}>
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={p.title || p.name || "product"}
                          style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 4 }}
                          onError={(e) => {
                            // lightweight fallback svg
                            e.target.onerror = null;
                            e.target.src =
                              "data:image/svg+xml;utf8," +
                              encodeURIComponent(
                                '<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><rect width="100%" height="100%" fill="#f4f4f4"/></svg>'
                              );
                          }}
                        />
                      ) : (
                        <div style={{ width: 60, height: 60, background: "#f4f4f4", borderRadius: 4 }} />
                      )}
                    </td>

                    <td style={{ padding: 8, verticalAlign: "middle", maxWidth: 320 }}>{p.title || p.name || "-"}</td>

                    <td style={{ padding: 8, verticalAlign: "middle" }}>
                      {typeof p.price === "number" ? `₹${p.price}` : p.price ?? "-"}
                    </td>

                    <td style={{ padding: 8, verticalAlign: "middle" }}>{p.stock ?? "-"}</td>

                    <td style={{ padding: 8, verticalAlign: "middle" }}>{p.category ?? "-"}</td>

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
        </div>
      )}
    </div>
  );
}
