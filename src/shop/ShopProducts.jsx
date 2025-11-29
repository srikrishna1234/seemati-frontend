// src/shop/ShopProducts.jsx
import React, { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance"; // leave this alone
import ShopProductCard from "./shopProductCard";

/**
 * ShopProducts
 * - Uses axiosInstance for dev/local and production.
 * - getApiBasePrefix ensures we don't accidentally call localhost from the public site.
 * - Defensive extraction for different API response shapes.
 */

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

    const prefix = getApiBasePrefix(); // "" or "https://api.seemati.in"
    const url = prefix
      ? `${prefix}/api/products?page=1&limit=${limit}&fields=_id,title,slug,price,thumbnail,images`
      : `/api/products?page=1&limit=${limit}&fields=_id,title,slug,price,thumbnail,images`;

    axiosInstance
      .get(url)
      .then((res) => {
        if (!mounted) return;
        // Defensive payload extraction:
        // common shapes: res.data (array) OR res.data.data (array or object with docs/products) OR res.data.data.products OR res.data.data.docs
        const top = res?.data ?? res;
        console.log("ShopProducts - raw response top:", top);

        let list = [];
        if (Array.isArray(top)) {
          list = top;
        } else if (Array.isArray(top?.data)) {
          list = top.data;
        } else if (Array.isArray(top?.data?.products)) {
          list = top.data.products;
        } else if (Array.isArray(top?.data?.docs)) {
          list = top.data.docs;
        } else if (Array.isArray(top?.products)) {
          list = top.products;
        } else if (Array.isArray(top?.docs)) {
          list = top.docs;
        } else {
          // fallback: maybe res.data contains an object that *is* the list
          const maybeArray = top?.data ?? top;
          list = Array.isArray(maybeArray) ? maybeArray : [];
        }

        console.log("ShopProducts - extracted list length:", list.length);
        setProducts(list);
      })
      .catch((err) => {
        if (!mounted) return;
        console.error("ShopProducts - Failed to fetch products", err);
        setError("Could not load products");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

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
          <ShopProductCard
            key={p._id || p.id || p.slug}
            product={p}
            onClick={() => {
              if (p.slug) {
                // keep same behavior you used earlier
                window.location.href = `/product/${p.slug}`;
              } else if (p._id) {
                window.location.href = `/product/${p._id}`;
              }
            }}
          />
        ))}
      </div>
    </section>
  );
}
