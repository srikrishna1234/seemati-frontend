// src/shop/ShopProducts.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import ShopProductCard from "./shopProductCard";

/**
 * ShopProducts
 * - Uses ShopProductCard (your existing file naming)
 * - Accepts `products` prop (if you already have products loaded)
 * - Otherwise fetches basic product fields from API
 *
 * Usage:
 *  <ShopProducts />
 *  or
 *  <ShopProducts products={myProducts} />
 */

export default function ShopProducts({ products: initialProducts, limit = 48 }) {
  const [products, setProducts] = useState(initialProducts || []);
  const [loading, setLoading] = useState(!initialProducts);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialProducts) return;

    let mounted = true;
    setLoading(true);
    setError(null);

    axios
      .get(`/api/products?page=1&limit=${limit}&fields=_id,title,slug,price,thumbnail,images`)
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
          <ShopProductCard
            key={p._id}
            product={p}
            onClick={() => {
              if (p.slug) {
                window.location.href = `/product/${p.slug}`;
              }
            }}
          />
        ))}
      </div>
    </section>
  );
}
