// src/pages/ProductListPage.jsx
import React, { useEffect, useState } from "react";
import ProductCard from "../components/ProductCard";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

export default function ProductListPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`${BASE_URL}/admin-api/products`);
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`Failed to load products: ${res.status} ${txt}`);
        }
        const data = await res.json();
        if (!mounted) return;
        // API returns array (normalized in your server)
        setProducts(Array.isArray(data) ? data : (data.products || []));
      } catch (e) {
        console.error("Product list load error", e);
        if (mounted) setErr(e.message || "Failed to load products");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="p-6">Loading products…</div>;
  if (err) return <div className="p-6 text-red-600">Error: {err}</div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-6">Products</h2>

      {products.length === 0 ? (
        <div className="text-gray-600">No products found.</div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 20,
            alignItems: "start",
          }}
        >
          {products.map((p) => {
            const id = p._id || p.id || Math.random().toString(36).slice(2, 9);
            // render ProductCard — it handles image, price, add/view/save styling
            return <ProductCard key={id} product={p} to={`/product/${id}`} />;
          })}
        </div>
      )}
    </div>
  );
}
