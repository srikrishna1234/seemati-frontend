// src/admin/AdminProductList.jsx
import React, { useEffect, useState } from 'react';
import axios from '../api/axiosInstance'; // adjust path if needed

export default function AdminProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function loadProducts() {
      setLoading(true);
      setError(null);
      try {
        // Since axios baseURL includes /api (per .env), call '/products' here
        const res = await axios.get('/products');
        // API returns object { ok, page, products, ... }
        const payload = res.data;
        const items = payload.products || payload; 
        if (mounted) setProducts(items);
      } catch (err) {
        console.error('Failed to fetch products:', err);
        if (mounted) setError(err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadProducts();
    return () => { mounted = false; };
  }, []);

  if (loading) return <div>Loading products…</div>;
  if (error) return <div style={{color:'red'}}>Error: {error.message || 'Failed to load products'}</div>;
  if (!products || products.length === 0) return <div>No products found.</div>;

  return (
    <div>
      <h1>Products</h1>
      <ul>
        {products.map(p => (
          <li key={p._id || p.id}>
            <strong>{p.title || p.name}</strong> — {p.price ? `₹${p.price}` : 'No price'}
          </li>
        ))}
      </ul>
    </div>
  );
}
