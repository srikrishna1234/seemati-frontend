// AdminProductList.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import axios from "../api/axiosInstance"; // adjust if path differs
import { useHistory } from "react-router-dom"; // if you use react-router

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

function getImageUrl(product) {
  const maybe = product.images ?? product.image ?? product.imageUrls ?? null;
  if (!maybe) return "";
  const first = Array.isArray(maybe) ? maybe[0] : maybe;
  if (!first) return "";
  if (typeof first === "string" && (first.startsWith("http://") || first.startsWith("https://"))) {
    return first;
  }
  const trimmed = String(first).replace(/^\/+/, "");
  return `${API_URL}/${trimmed}`;
}

function Thumbnail({ src, alt }) {
  const imgRef = useRef(null);

  // prevent infinite onError loops by checking current src
  function handleError(e) {
    try {
      const el = e.currentTarget;
      // if already set to placeholder, don't change it again
      if (!el.dataset.fallbackApplied) {
        el.dataset.fallbackApplied = "1";
        el.src = "/placeholder-80.png";
      }
    } catch (err) {
      // ignore
    }
  }

  return (
    <img
      ref={imgRef}
      src={src || "/placeholder-80.png"}
      alt={alt || "product"}
      width="80"
      height="80"
      loading="lazy"
      decoding="async"
      onError={handleError}
      style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 6, background: "#f6f6f6" }}
    />
  );
}

function AdminProductListInner() {
  const [products, setProducts] = useState([]);
  const mountedRef = useRef(true);
  const inFlightRef = useRef(false);
  const fetchCountRef = useRef(0);
  const renderCountRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const history = typeof useHistory === "function" ? useHistory() : null;

  renderCountRef.current += 1;
  // DEBUG: uncomment during local dev to see re-render frequency
  // console.log("AdminProductList renderCount:", renderCountRef.current);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // guard to avoid multiple fetches
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    fetchProducts().finally(() => {
      inFlightRef.current = false;
    });
    // run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchProducts() {
    try {
      fetchCountRef.current += 1;
      // console.log('fetchProducts call:', fetchCountRef.current);
      setLoading(true);
      const res = await axios.get("/admin/products");
      const data = res.data ?? {};
      const list = Array.isArray(data) ? data : data.products ?? data.result ?? [];
      if (!mountedRef.current) return;
      setProducts(list);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch products:", err);
      setError("Could not load products. Check backend or network.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  // memoize the list to avoid re-computations on unrelated rerenders
  const memoProducts = useMemo(() => products, [products]);

  async function handleDelete(productId, e) {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (!confirm("Delete this product permanently?")) return;
    try {
      await axios.delete(`/admin/products/${productId}`);
      setProducts((prev) => prev.filter((p) => (p._id ?? p.id) !== productId));
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Delete failed. Check server logs / network.");
    }
  }

  function handleRowClick(product) {
    // prevent redirect to shop; open admin edit
    const id = product._id ?? product.id;
    if (history && history.push) history.push(`/admin/products/edit/${id}`);
    else window.location.href = `/admin/products/edit/${id}`;
  }

  if (loading) return <div>Loading products…</div>;

  return (
    <div className="admin-product-list p-4">
      <h2 className="text-xl mb-4">Admin — Products</h2>
      {error && <div style={{ color: "red", marginBottom: 12 }}>{error}</div>}
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th className="text-left p-2">Image</th>
            <th className="text-left p-2">Title</th>
            <th className="text-left p-2">SKU</th>
            <th className="text-left p-2">Price</th>
            <th className="text-left p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {memoProducts.length === 0 && (
            <tr><td colSpan={5} className="p-4">No products found.</td></tr>
          )}
          {memoProducts.map((product) => {
            const id = product._id ?? product.id;
            const img = (() => {
              try {
                return getImageUrl(product);
              } catch (e) {
                return "";
              }
            })();
            return (
              <tr key={id} className="border-t" style={{ cursor: "pointer" }} onClick={() => handleRowClick(product)}>
                <td className="p-2" style={{ width: 100 }}>
                  <Thumbnail src={img} alt={product.title ?? product.name} />
                </td>
                <td className="p-2">
                  <div style={{ fontWeight: 600 }}>{product.title ?? product.name}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>{product.category ?? ""}</div>
                </td>
                <td className="p-2">{product.sku ?? product.code ?? "-"}</td>
                <td className="p-2">₹{product.price ?? product.mrp ?? "-"}</td>
                <td className="p-2">
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // navigate to edit without letting row click happen
                        const id = product._id ?? product.id;
                        if (history && history.push) history.push(`/admin/products/edit/${id}`);
                        else window.location.href = `/admin/products/edit/${id}`;
                      }}
                      style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc" }}
                    >
                      Edit
                    </button>

                    <button
                      onClick={(e) => handleDelete(id, e)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: "1px solid #e53935",
                        background: "transparent",
                        color: "#b71c1c",
                      }}
                    >
                      Delete
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

// memoize the whole component to reduce rerenders from parent unless props change
const AdminProductList = React.memo(AdminProductListInner);
export default AdminProductList;
