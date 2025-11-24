// AdminProductList.jsx
import React, { useEffect, useState } from "react";
import axios from "../api/axiosInstance"; // uses your existing axiosInstance
// If axiosInstance exports default axios configured with baseURL, good.
// Otherwise replace with 'import axios from "axios";' and use full URL below.

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

export default function AdminProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchProducts() {
    try {
      setLoading(true);
      const res = await axios.get("/admin/products"); // keep relative if axiosInstance has baseURL
      setProducts(Array.isArray(res.data) ? res.data : res.data.products ?? []);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch products:", err);
      setError("Could not load products. Check backend or network.");
    } finally {
      setLoading(false);
    }
  }

  function getImageUrl(product) {
    // Handles cases where product.images is an array, or product.image is a string path,
    // or already an absolute URL.
    const maybe = product.images ?? product.image ?? product.imageUrls ?? null;

    if (!maybe) return ""; // no image

    const first = Array.isArray(maybe) ? maybe[0] : maybe;

    // If it already looks like an absolute URL, return as-is
    if (typeof first === "string" && (first.startsWith("http://") || first.startsWith("https://"))) {
      return first;
    }

    // Otherwise assume backend serves under /uploads or as provided path (trim leading slashes)
    const trimmed = String(first).replace(/^\/+/, "");
    return `${API_URL}/${trimmed}`;
  }

  async function handleDelete(productId) {
    if (!confirm("Delete this product permanently? This action cannot be undone.")) return;
    try {
      setDeletingId(productId);
      await axios.delete(`/admin/products/${productId}`);
      // optimistic: remove locally
      setProducts((prev) => prev.filter((p) => p._id !== productId && p.id !== productId));
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Delete failed. Check server logs / network.");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return <div>Loading products…</div>;

  return (
    <div className="admin-product-list p-4">
      <h2 className="text-xl mb-4">Products</h2>
      {error && <div style={{ color: "red", marginBottom: 12 }}>{error}</div>}
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th className="text-left p-2">Image</th>
            <th className="text-left p-2">Title</th>
            <th className="text-left p-2">SKU / Code</th>
            <th className="text-left p-2">Price</th>
            <th className="text-left p-2">Stock</th>
            <th className="text-left p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 && (
            <tr>
              <td colSpan={6} className="p-4">No products found.</td>
            </tr>
          )}
          {products.map((product) => {
            const id = product._id ?? product.id;
            const img = getImageUrl(product);
            return (
              <tr key={id} className="border-t">
                <td className="p-2">
                  {img ? (
                    // small thumbnail, keeps aspect ratio
                    <img
                      src={img}
                      alt={product.title || product.name || "product"}
                      style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 6 }}
                      onError={(e) => {
                        // fallback: hide broken image
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "/placeholder-80.png"; // optional placeholder in public/
                      }}
                    />
                  ) : (
                    <div style={{ width: 80, height: 80, background: "#eee", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6 }}>
                      No Image
                    </div>
                  )}
                </td>

                <td className="p-2">
                  <div style={{ fontWeight: 600 }}>{product.title ?? product.name}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>{product.category ?? ""}</div>
                </td>

                <td className="p-2">{product.sku ?? product.code ?? "-"}</td>
                <td className="p-2">₹{product.price ?? product.mrp ?? "-"}</td>
                <td className="p-2">{product.stock ?? product.quantity ?? "-"}</td>

                <td className="p-2">
                  <div style={{ display: "flex", gap: 8 }}>
                    <a
                      className="btn-edit"
                      href={`/admin/products/edit/${id}`}
                      style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc", textDecoration: "none" }}
                    >
                      Edit
                    </a>

                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(id)}
                      disabled={deletingId === id}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: "1px solid #e53935",
                        background: deletingId === id ? "#f8d7da" : "transparent",
                        cursor: deletingId === id ? "wait" : "pointer",
                        color: "#b71c1c",
                      }}
                      title="Delete product"
                    >
                      {deletingId === id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
