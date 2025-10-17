// src/admin/AdminProductList.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * AdminProductList replacement
 * - fetches admin product list
 * - Edit button tries both common edit route styles:
 *     /admin/products/:id/edit   (preferred)
 *     /admin/products/edit/:id
 *   It will navigate to the first one it believes your app supports.
 * - If navigation fails (route not found) you can open the edit URL in a new tab (for debugging)
 */

export default function AdminProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pageSize, setPageSize] = useState(10);
  const navigate = useNavigate();

  async function fetchProducts() {
    setLoading(true);
    setError(null);
    try {
      // Using admin-api endpoint (your logs show /admin-api/products)
      const res = await fetch(`/admin-api/products?page=1&limit=${pageSize}`, { credentials: "include" });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Fetch failed: ${res.status} ${txt}`);
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.products ?? [];
      setProducts(list);
    } catch (err) {
      console.error("Failed to load products", err);
      setError(String(err));
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts();
  }, [pageSize]);

  async function handleDelete(prod) {
    const id = prod._id ?? prod.id ?? prod.slug;
    if (!window.confirm(`Delete "${prod.title ?? prod.name ?? id}" ?`)) return;
    try {
      const res = await fetch(`/admin-api/products/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Delete failed: ${res.status} ${txt}`);
      }
      await fetchProducts();
    } catch (err) {
      console.error("Delete error", err);
      alert("Delete failed: " + (err.message || err));
    }
  }

  /**
   * handleEdit:
   * - prefers route /admin/products/:id/edit
   * - falls back to /admin/products/edit/:id
   * - also offers to open the edit URL in a new tab if navigation appears to fail
   */
  function handleEdit(prod) {
    const id = prod._id ?? prod.id ?? prod.slug;
    if (!id) {
      alert("Product id/slug missing — cannot edit.");
      console.error("Edit attempted but product has no id/slug:", prod);
      return;
    }

    // Primary guess: /admin/products/:id/edit
    const primary = `/admin/products/${encodeURIComponent(id)}/edit`;
    // Fallback: /admin/products/edit/:id
    const fallback = `/admin/products/edit/${encodeURIComponent(id)}`;

    // Try to navigate to the primary path.
    try {
      console.log(`[AdminProductList] navigating to ${primary}`);
      navigate(primary);
      // Give the router a moment; if route doesn't match, developer will see console and can try fallback/open tab.
    } catch (err) {
      console.warn("[AdminProductList] navigate primary failed, trying fallback", err);
      try {
        navigate(fallback);
      } catch (err2) {
        console.error("[AdminProductList] both navigate attempts failed", err2);
        // final fallback: open in new tab (useful for debugging server-side routes)
        if (window.confirm("Unable to open edit route in-app. Open edit page in a new tab?")) {
          window.open(primary, "_blank");
        }
      }
    }
  }

  // Alternative: open preview in new tab (product page)
  function handlePreview(prod) {
    const slugOrId = prod.slug ?? prod._id ?? prod.id;
    if (!slugOrId) {
      alert("Cannot preview: slug/id missing");
      return;
    }
    window.open(`/product/${slugOrId}`, "_blank");
  }

  function handleAdd() {
    navigate("/admin/products/add");
  }

  return (
    <div style={{ padding: 20 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <h1 style={{ margin: 0 }}>Products</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            aria-label="per-page"
            value={pageSize}
            onChange={(e) => setPageSize(Math.max(1, Number(e.target.value || 10)))}
            style={{ width: 90, padding: "6px 8px" }}
          />
          <button onClick={handleAdd} style={{ padding: "8px 12px", background: "#6b21a8", color: "#fff", border: "none", borderRadius: 6 }}>
            Add
          </button>
        </div>
      </header>

      {loading ? (
        <div>Loading products…</div>
      ) : error ? (
        <div style={{ color: "#b91c1c" }}>Error loading products: {error}</div>
      ) : products.length === 0 ? (
        <div>No products found.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                <th style={{ padding: "12px 8px", width: 40 }}>#</th>
                <th style={{ padding: "12px 8px", width: 120 }}>Image</th>
                <th style={{ padding: "12px 8px" }}>Title</th>
                <th style={{ padding: "12px 8px", width: 220 }}>Slug</th>
                <th style={{ padding: "12px 8px", width: 100 }}>Price</th>
                <th style={{ padding: "12px 8px", width: 180 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, idx) => {
                const id = p._id ?? p.id ?? p.slug ?? String(idx);
                const img = (p.images && p.images[0] && (p.images[0].url || p.images[0])) || p.thumbnail || p.image || "";
                return (
                  <tr key={id} style={{ borderBottom: "1px solid #f3f3f3" }}>
                    <td style={{ padding: "14px 8px" }}>{idx + 1}</td>
                    <td style={{ padding: "12px 8px" }}>
                      <div style={{ width: 80, height: 80, borderRadius: 8, overflow: "hidden", border: "1px solid #f3f3f3", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}>
                        {img ? <img alt={p.title} src={img.startsWith("http") ? img : `${img}`} style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <div style={{ color: "#9ca3af", fontSize: 12 }}>No image</div>}
                      </div>
                    </td>
                    <td style={{ padding: "12px 8px" }}>{p.title ?? p.name ?? "-"}</td>
                    <td style={{ padding: "12px 8px", color: "#6b7280" }}>{p.slug ?? "-"}</td>
                    <td style={{ padding: "12px 8px" }}>₹{Number(p.price ?? p.mrp ?? 0).toFixed(0)}</td>
                    <td style={{ padding: "12px 8px" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => handleEdit(p)} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #e6e6e6", background: "#fff", cursor: "pointer" }}>
                          Edit
                        </button>
                        <button onClick={() => handleDelete(p)} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #e6e6e6", background: "#fff", cursor: "pointer", color: "#dc2626" }}>
                          Delete
                        </button>
                        <button onClick={() => handlePreview(p)} title="Preview product" style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #e6e6e6", background: "#fff" }}>
                          Preview
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
