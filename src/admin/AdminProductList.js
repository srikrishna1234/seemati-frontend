// src/admin/AdminProductList.js
import React, { useEffect, useState } from "react";
import axios from "../api/axiosInstance";

/**
 * AdminProductList.js
 * - Full replacement that handles mixed image formats your API returns:
 *   - absolute S3 URLs (https://...)
 *   - absolute localhost URLs (http://localhost:4000/uploads/...)
 *   - relative paths (/uploads/..., uploads/...)
 *   - image objects { url: '...', alt: '...' }
 *
 * Save this file as src/admin/AdminProductList.js (full replacement).
 */

function ensureNoDoubleSlash(a, b) {
  return `${a.replace(/\/$/, "")}/${b.replace(/^\//, "")}`;
}

function inferBaseForRelativePaths() {
  const envApi = process.env.REACT_APP_API_URL;
  if (envApi) return envApi.replace(/\/$/, "");
  if (typeof window !== "undefined") {
    try {
      const origin = new URL(window.location.origin);
      if (origin.hostname === "localhost" || origin.hostname === "127.0.0.1") {
        origin.port = "4000";
      }
      return origin.toString().replace(/\/$/, "");
    } catch (e) {}
  }
  return "http://localhost:4000";
}

function normalizeImageEntry(entry) {
  if (!entry) return null;
  if (typeof entry === "string") return entry;
  if (typeof entry === "object" && entry.url) return entry.url;
  return null;
}

function buildImageUrlFromPath(pathOrUrl) {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = inferBaseForRelativePaths();
  return ensureNoDoubleSlash(base, pathOrUrl);
}

function getPrimaryImageUrl(product) {
  const imgs = product?.images || product?.image || [];
  if (typeof imgs === "string") {
    const normalized = normalizeImageEntry(imgs);
    return buildImageUrlFromPath(normalized);
  }
  if (Array.isArray(imgs) && imgs.length > 0) {
    for (const candidate of imgs) {
      const urlOrPath = normalizeImageEntry(candidate);
      if (!urlOrPath) continue;
      if (/^https?:\/\//i.test(urlOrPath)) return urlOrPath;
      return buildImageUrlFromPath(urlOrPath);
    }
  }
  return "";
}

export default function AdminProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    axios
      .get("/products")
      .then((res) => {
        if (!mounted) return;
        const payload = res?.data;
        const list = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.products)
          ? payload.products
          : payload?.data || [];
        setProducts(list);
      })
      .catch((err) => {
        console.error("Failed to fetch products:", err);
        setError(err?.message || "Failed to fetch products");
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <div>Loading products…</div>;
  if (error) return <div style={{ color: "red" }}>Error: {error}</div>;

  return (
    <div style={{ padding: 12 }}>
      <h2>Admin — Products</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ borderBottom: "1px solid #ddd", padding: 8 }}>Image</th>
            <th style={{ borderBottom: "1px solid #ddd", padding: 8 }}>Title</th>
            <th style={{ borderBottom: "1px solid #ddd", padding: 8 }}>SKU</th>
            <th style={{ borderBottom: "1px solid #ddd", padding: 8 }}>Price</th>
            <th style={{ borderBottom: "1px solid #ddd", padding: 8 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const imgUrl = getPrimaryImageUrl(p) || "/placeholder-80.png";
            return (
              <tr key={p._id || p.id || p.sku}>
                <td style={{ padding: 8, verticalAlign: "middle" }}>
                  <img
                    src={imgUrl}
                    alt={p.title || "product image"}
                    style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 6 }}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "/placeholder-80.png";
                    }}
                  />
                </td>
                <td style={{ padding: 8 }}>{p.title || p.name}</td>
                <td style={{ padding: 8 }}>{p.sku || "-"}</td>
                <td style={{ padding: 8 }}>{p.price ? `₹ ${p.price}` : "-"}</td>
                <td style={{ padding: 8 }}>
                  <button onClick={() => (window.location.href = `/admin/edit/${p._id || p.id}`)}>Edit</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
