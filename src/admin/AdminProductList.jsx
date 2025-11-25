// File: src/admin/AdminProductList.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../api/axiosInstance'; // if this doesn't exist, the code will fallback to fetch

export default function AdminProductList({ onDelete }) {
  const [products, setProducts] = useState(null); // null = loading, [] = loaded empty
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usedEndpoint, setUsedEndpoint] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function tryFetch(url) {
      try {
        // prefer axios if available
        if (axios && typeof axios.get === 'function') {
          const res = await axios.get(url);
          return { ok: true, data: res.data, status: res.status };
        } else {
          const r = await fetch(url, { credentials: 'include' });
          const txt = await r.text();
          let data = null;
          try { data = JSON.parse(txt); } catch(e){ data = txt; }
          return { ok: r.ok, data, status: r.status, statusText: r.statusText };
        }
      } catch (err) {
        return { ok: false, error: err };
      }
    }

    async function load() {
      setLoading(true);
      setError(null);

      // list of candidate endpoints (try admin first, then public)
      const endpoints = ['/admin/products', '/products'];

      for (let i = 0; i < endpoints.length; i++) {
        const ep = endpoints[i];
        // if you use a custom API base, modify ep to include it, e.g. `${process.env.REACT_APP_API_BASE}${ep}`
        const result = await tryFetch(ep);
        if (cancelled) return;

        if (result.ok && Array.isArray(result.data)) {
          setProducts(result.data);
          setUsedEndpoint(ep);
          setLoading(false);
          return;
        }

        // if endpoint returned 200 but not an array, show it for debugging
        if (result.ok && !Array.isArray(result.data)) {
          setError(`Endpoint ${ep} returned ${typeof result.data} (expected array). Response: ${JSON.stringify(result.data).slice(0,200)}`);
          setProducts([]);
          setUsedEndpoint(ep);
          setLoading(false);
          return;
        }

        // if fetch failed with a status, collect that in error and try next endpoint
        if (result.status && !result.ok) {
          // try next if present, but remember last error
          setError(`GET ${ep} returned HTTP ${result.status}${result.statusText ? ' ' + result.statusText : ''}`);
          continue;
        }

        // if exception
        if (!result.ok && result.error) {
          setError(`Request ${ep} failed: ${String(result.error).slice(0,200)}`);
          continue;
        }
      }

      // none succeeded
      setProducts([]);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-semibold">Admin — Products</h2>

        <Link
          to="/admin/products/new"
          className="inline-block bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-700"
        >
          Add product
        </Link>
      </div>

      <div className="overflow-x-auto bg-white border rounded p-4">
        {loading && <div className="text-sm text-gray-600">Loading products...</div>}

        {!loading && error && (
          <div className="mb-4 text-sm text-red-600">
            <strong>Error:</strong> {error}
            <div className="text-xs text-gray-500 mt-1">Tried endpoint: {usedEndpoint ?? 'none'}</div>
          </div>
        )}

        {!loading && products && products.length === 0 && (
          <div className="text-gray-600">No products found.</div>
        )}

        {!loading && products && products.length > 0 && (
          <table className="min-w-full divide-y">
            <thead className="bg-white">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Image</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Title</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">SKU</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Price</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {products.map((p) => {
                const thumb = (p.images && p.images.length) ? p.images[0] : p.image || '';
                return (
                  <tr key={p._id || p.id || p.sku || Math.random()}>
                    <td className="px-4 py-3 align-middle">
                      <div className="w-20 h-20 rounded overflow-hidden border flex items-center justify-center bg-gray-50">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={p.name || 'product thumbnail'}
                            className="w-full h-full object-contain"
                            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/fallback-product.png'; }}
                          />
                        ) : (
                          <div className="text-xs text-gray-400">No image</div>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 align-middle">
                      <div className="text-sm font-medium text-gray-900">{p.name}</div>
                    </td>

                    <td className="px-4 py-3 align-middle">
                      <div className="text-sm text-gray-700">{p.sku || p.SKU || '-'}</div>
                    </td>

                    <td className="px-4 py-3 align-middle">
                      <div className="text-sm text-gray-900">
                        {typeof p.price === 'number' ? `₹ ${p.price}` : p.price ?? '-'}
                      </div>
                    </td>

                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-3">
                        <Link to={`/admin/products/${p._id || p.id}/edit`} className="px-3 py-1 border rounded hover:bg-gray-50">
                          Edit
                        </Link>
                        <button onClick={() => onDelete && onDelete(p._id || p.id)} className="px-3 py-1 border rounded text-red-600 hover:bg-red-50">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
