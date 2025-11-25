import React from 'react';
import { Link } from 'react-router-dom';

/**
 * AdminProductList - full replacement file
 *
 * Props:
 * - products: array of product objects [{ _id, name, price, stock, images: [url,...], sku }]
 * - onDelete: function(productId)
 *
 * Notes:
 * - Edit link points to /admin/products/:id/edit
 * - Add Product button links to /admin/products/new (change if your route differs)
 * - Thumbnails use object-fit: contain so full image is visible.
 */

export default function AdminProductList({ products = [], onDelete }) {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-semibold">Admin — Products</h2>

        {/* Add Product button */}
        <Link
          to="/admin/products/new"
          className="inline-block bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-700"
        >
          Add product
        </Link>
      </div>

      <div className="overflow-x-auto bg-white border rounded">
        <table className="min-w-full divide-y">
          <thead className="bg-white">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Image</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Title</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">SKU</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Price</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {products.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No products found.
                </td>
              </tr>
            ) : (
              products.map((p) => {
                // choose first image if available
                const thumb = (p.images && p.images.length) ? p.images[0] : p.image || ''; 

                return (
                  <tr key={p._id}>
                    <td className="px-6 py-4 align-middle">
                      <div className="w-20 h-20 rounded overflow-hidden border flex items-center justify-center bg-gray-50">
                        {thumb ? (
                          // Tailwind: w-20 h-20 and object-contain ensures full image visible
                          <img
                            src={thumb}
                            alt={p.name || 'product thumbnail'}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = '/fallback-product.png'; // optional fallback
                            }}
                          />
                        ) : (
                          <div className="text-xs text-gray-400">No image</div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 align-middle">
                      <div className="text-sm font-medium text-gray-900">{p.name}</div>
                    </td>

                    <td className="px-6 py-4 align-middle">
                      <div className="text-sm text-gray-700">{p.sku || p.SKU || '-'}</div>
                    </td>

                    <td className="px-6 py-4 align-middle">
                      <div className="text-sm text-gray-900">
                        {typeof p.price === 'number' ? `₹ ${p.price}` : p.price ?? '-'}
                      </div>
                    </td>

                    <td className="px-6 py-4 align-middle">
                      <div className="flex items-center gap-3">
                        <Link
                          to={`/admin/products/${p._id}/edit`}
                          className="px-3 py-1 border rounded hover:bg-gray-50"
                        >
                          Edit
                        </Link>

                        <button
                          onClick={() => onDelete && onDelete(p._id)}
                          className="px-3 py-1 border rounded text-red-600 hover:bg-red-50"
                          aria-label={`Delete ${p.name}`}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
