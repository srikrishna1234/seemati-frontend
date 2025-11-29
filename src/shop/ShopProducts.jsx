// src/shop/ShopProducts.jsx
import React, { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance"; // leave this alone
import ShopProductCard from "./shopProductCard";

/**
 * ShopProducts (safe minimal change)
 * - Uses axiosInstance for dev/local.
 * - When running on production host (seemati.in) it prefixes the public API host
 *   so this page doesn't accidentally call localhost.
 */

function getApiBasePrefix() {
  // If an explicit environment override is set (REACT_APP_API_BASE) use it.
  if (process.env.REACT_APP_API_BASE) return process.env.REACT_APP_API_BASE.replace(/\/$/, "");

  // If running locally (localhost, 127.0.0.1) prefer relative base and axiosInstance (which likely points to localhost).
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  if (host === "localhost" || host === "127.0.0.1") {
    return ""; // keep relative - axiosInstance/base will handle it
  }

  // If we're on the public site (seemati.in), force the public API base to avoid hitting localhost
  if (host === "seemati.in" || host.endsWith("seemati.in")) {
    return "https://api.seemati.in";
  }

  // default: no prefix (use axiosInstance)
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

    const prefix = getApiBasePrefix(); // might be "" or "https://api.seemati.in"
    const url = prefix
      ? `${prefix}/api/products?page=1&limit=${limit}&fields=_id,title,slug,price,thumbnail,images`
      : `/api/products?page=1&limit=${limit}&fields=_id,title,slug,price,thumbnail,images`;

    // Use axiosInstance for both paths — axiosInstance will accept absolute URL too.
    axiosInstance
      .get(url)
      .then((res) => {
        if (!mounted) return;
        const data = res?.data?.data || res?.data || [];
        setProducts(Array.isArray(data) ? data : data.docs || []);
      })
      .catch((err) => {
        if (!mounted) return;
        console.error("Failed to fetch products", err);
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
    <section>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {products.map((p) => (
          <ShopProductCard key={p._id} product={p} onClick={() => p.slug && (window.location.href = `/product/${p.slug}`)} />
        ))}
      </div>
    </section>
  );
}
