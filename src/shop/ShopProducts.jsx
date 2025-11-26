// frontend/src/shop/ShopProducts.jsx
import React, { useEffect, useState } from "react";
import axios from "../api/axiosInstance"; // your shared axiosInstance
import { Link } from "react-router-dom";

export default function ShopProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function loadProducts() {
      try {
        setLoading(true);
        setError(null);

        // IMPORTANT: request backend at /api/products (backend mounts routes at /api)
        const res = await axios.get("/api/products?page=1&limit=8&fields=title,price,mrp,compareAtPrice,slug,thumbnail,images,description");

        // Backend returns { ok, page, limit, total, totalPages, products }
        const data = res.data;
        const list = Array.isArray(data.products) ? data.products : data;

        if (!mounted) return;

        // Normalize image URLs (replace localhost uploads with API domain)
        const normalized = list.map((p) => {
          const images = Array.isArray(p.images)
            ? p.images.map((img) => {
                let url = img && (img.url || img);
                if (!url) return img;
                // if image points to localhost in DB (dev leftover), rewrite to production host
                if (typeof url === "string" && url.startsWith("http://localhost:")) {
                  // replace with https://api.seemati.in/uploads/... (backend serves uploads at that path)
                  url = url.replace(/^http:\/\/localhost:\d+/, "https://api.seemati.in");
                }
                return typeof img === "string" ? url : { ...(img || {}), url };
              })
            : [];

        return { ...p, images };
        });

        setProducts(normalized);
      } catch (err) {
        console.error("loadProducts error", err);
        setError(err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadProducts();
    return () => (mounted = false);
  }, []);

  if (loading) return <div style={{ padding: 20 }}>Loading products…</div>;
  if (error) return <div style={{ padding: 20, color: "red" }}>Failed to load products: {error.message || String(error)}</div>;
  if (!products.length) return <div style={{ padding: 20 }}>No products found.</div>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Products</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 16 }}>
        {products.map((p) => {
          const id = p._id || p.id || p.productId;
          const firstImage = (p.images && p.images[0] && (p.images[0].url || p.images[0])) || "";
          return (
            <div key={id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
              <Link to={`/product/${p.slug || id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", background: "#fafafa", marginBottom: 8 }}>
                  {firstImage ? (
                    <img src={firstImage} alt={p.title || "product"} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                  ) : (
                    <div style={{ width: "80%", height: "80%", background: "#f4f4f4", borderRadius: 6 }} />
                  )}
                </div>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>{p.title || "Untitled"}</div>
                <div style={{ color: "#666", marginBottom: 6 }}>{p.description ? (p.description.length > 80 ? p.description.slice(0, 80) + "…" : p.description) : ""}</div>
                <div style={{ fontWeight: 700 }}>₹{p.price != null ? p.price : "—"}</div>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
