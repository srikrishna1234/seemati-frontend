// src/shop/ShopProducts.jsx
import React, { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance"; // leave this alone
import ShopProductCard from "./shopProductCard";

function getApiBasePrefix() {
  if (process.env.REACT_APP_API_BASE) return process.env.REACT_APP_API_BASE.replace(/\/$/, "");
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  if (host === "localhost" || host === "127.0.0.1") return "";
  if (host === "seemati.in" || host.endsWith("seemati.in")) return "https://api.seemati.in";
  return "";
}

export default function ShopProducts({ products: initialProducts, limit = 48 }) {
  const [products, setProducts] = useState(initialProducts || []);
  const [loading, setLoading] = useState(!initialProducts);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialProducts) return;

    let mounted = true;
    setLoading(true);
    setError(null);

    const prefix = getApiBasePrefix();
    const url = prefix
      ? `${prefix}/api/products?page=1&limit=${limit}&fields=_id,title,slug,price,thumbnail,images`
      : `/api/products?page=1&limit=${limit}&fields=_id,title,slug,price,thumbnail,images`;

    axiosInstance
      .get(url)
      .then((res) => {
        if (!mounted) return;
        const top = res?.data ?? res;
        // defensive extraction
        let list = [];
        if (Array.isArray(top)) list = top;
        else if (Array.isArray(top?.data)) list = top.data;
        else if (Array.isArray(top?.data?.products)) list = top.data.products;
        else if (Array.isArray(top?.data?.docs)) list = top.data.docs;
        else if (Array.isArray(top?.products)) list = top.products;
        else if (Array.isArray(top?.docs)) list = top.docs;
        else list = Array.isArray(top) ? top : [];
        setProducts(list);
        console.log("ShopProducts - items:", list.length);
      })
      .catch((err) => {
        if (!mounted) return;
        console.error("ShopProducts - fetch failed", err);
        setError("Could not load products");
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [initialProducts, limit]);

  if (loading) return <div className="py-12 text-center">Loading products…</div>;
  if (error) return <div className="py-12 text-center text-red-600">{error}</div>;
  if (!products || products.length === 0) return <div className="py-12 text-center">No products found.</div>;

  return (
    <section style={{ padding: "1rem 0" }}>
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 12px"
        }}
      >
        <div
          className="product-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 16,
            alignItems: "start",
            justifyItems: "center"
          }}
        >
          {products.map((p) => (
            <ShopProductCard
              key={p._id || p.id || p.slug}
              product={p}
              onClick={() => {
                if (p.slug) window.location.href = `/product/${p.slug}`;
                else if (p._id) window.location.href = `/product/${p._id}`;
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
