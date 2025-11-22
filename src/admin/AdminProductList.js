// src/admin/AdminProductList.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getImageUrl, getImageUrls } from "../utils/imageUtils";

export default function AdminProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pageSize, setPageSize] = useState(10);
  const navigate = useNavigate();

  // Use REACT_APP_API_URL if provided (must be set in .env for prod builds).
  // If empty, the fetch uses relative URLs (works with `proxy` in package.json during dev).
  const API_BASE = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "");

  // ADMIN token used for admin-only endpoints in dev (fallback provided).
  // **Do not store real secrets client-side in production.**
  const ADMIN_TOKEN = process.env.REACT_APP_ADMIN_TOKEN || "seemati123";

  // Candidate endpoints (will try sequentially)
  function candidateUrls(page, limit) {
    const qs = `?page=${page}&limit=${limit}`;
    const paths = [
      "/admin-api",           // try admin router root (returns {items: [...]})
      "/admin-api/products",  // explicit admin products route
      "/api/products",        // alternate upload/compat routes
      "/products",            // public route (last resort)
    ];

    return paths.map((p) => (API_BASE ? `${API_BASE}${p}${qs}` : `${p}${qs}`));
  }

  async function tryFetch(urls) {
    // tries each URL in order and returns the first OK response (json)
    for (const u of urls) {
      try {
        const res = await fetch(u, { credentials: "include" });
        if (res.ok) {
          const body = await res.json();
          return { body, usedUrl: u, status: res.status };
        } else {
          console.warn(`[AdminProductList] ${u} returned ${res.status}`);
        }
      } catch (err) {
        console.warn(`[AdminProductList] fetch ${u} error:`, err);
      }
    }
    throw new Error("No usable endpoint responded OK");
  }

  async function fetchProducts() {
    setLoading(true);
    setError(null);
    try {
      const urls = candidateUrls(1, pageSize);
      const result = await tryFetch(urls);
      const data = result.body;

      // Normalize product list from different possible shapes
      let list = [];
      // admin-api returns { items: [...] } in your backend
      if (Array.isArray(data)) list = data;
      else if (Array.isArray(data.items)) list = data.items;
      else if (Array.isArray(data.products)) list = data.products;
      else if (Array.isArray(data.products?.docs)) list = data.products.docs;
      else if (Array.isArray(data.products?.items)) list = data.products.items;
      else list = data.products ?? data.items ?? [];

      setProducts(list);
      console.log(`[AdminProductList] loaded from ${result.usedUrl} (status ${result.status})`);
    } catch (err) {
      console.error("Failed to load products", err);
      const attempted = candidateUrls(1, pageSize).join("  \n");
      setError(`Failed to load products. Tried endpoints:\n${attempted}\n\nConsole has details.`);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize]);

  async function handleDelete(prod) {
    const id = prod._id ?? prod.id ?? prod.slug;
    if (!id) return alert("Missing product id");
    if (!window.confirm(`Delete "${prod.title ?? prod.name ?? id}" ?`)) return;
    try {
      const base = API_BASE || "";
      const res = await fetch(`${base}/admin-api/products/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ADMIN_TOKEN}`,
        },
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

  function handleEdit(prod) {
    const id = prod._id ?? prod.id ?? prod.slug;
    if (!id) {
      alert("Product id/slug missing — cannot edit.");
      console.error("Edit attempted but product has no id/slug:", prod);
      return;
    }
    const primary = `/admin/products/${encodeURIComponent(id)}/edit`;
    const fallback = `/admin/products/edit/${encodeURIComponent(id)}`;
    try {
      navigate(primary);
    } catch (err) {
      try {
        navigate(fallback);
      } catch (err2) {
        if (window.confirm("Unable to open edit route in-app. Open edit page in a new tab?")) {
          window.open(primary, "_blank");
        }
      }
    }
  }

  function handlePreview(prod) {
    const slugOrId = prod.slug ?? prod._id ?? prod.id;
    if (!slugOrId) return alert("Cannot preview: slug/id missing");
    window.open(`/product/${slugOrId}`, "_blank");
  }

  function handleAdd() {
    navigate("/admin/products/add");
  }

  function renderImageForProduct(p) {
    const images = getImageUrls(p.images ?? p.gallery ?? []);
    if (images.length) return images[0];
    const raw = p.thumbnail ?? p.image ?? p.imageUrl ?? "";
    if (raw) return getImageUrl(raw);
    return getImageUrl("");
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
        <div style={{ color: "#b91c1c", whiteSpace: "pre-wrap" }}>Error loading products: {error}</div>
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
                const img = renderImageForProduct(p);
                return (
                  <tr key={id} style={{ borderBottom: "1px solid #f3f3f3" }}>
                    <td style={{ padding: "14px 8px" }}>{idx + 1}</td>
                    <td style={{ padding: "12px 8px" }}>
                      <div style={{ width: 80, height: 80, borderRadius: 8, overflow: "hidden", border: "1px solid #f3f3f3", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}>
                        {img ? (
                          <img
                            alt={p.title}
                            src={img}
                            style={{ width: "100%", height: "100%", objectFit: "contain" }}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = getImageUrl("");
                            }}
                          />
                        ) : (
                          <div style={{ color: "#9ca3af", fontSize: 12 }}>No image</div>
                        )}
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
