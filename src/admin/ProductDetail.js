// src/admin/ProductDetail.js
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";
const PLACEHOLDER = "/images/placeholder.png";

function toImageUrl(img) {
  if (!img) return null;
  // if it's an object like { url, path, filename }
  if (typeof img === "object") {
    const u = img.url || img.path || img.filename || null;
    if (!u) return null;
    if (typeof u === "string" && (u.startsWith("http://") || u.startsWith("https://"))) return u;
    return `${BASE_URL}${u.startsWith("/") ? u : `/${u}`}`;
  }
  // string case
  const s = String(img).trim();
  if (!s) return null;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  // protocol-relative
  if (s.startsWith("//")) return window.location.protocol + s;
  // relative path -> prefix with backend host
  return `${BASE_URL}${s.startsWith("/") ? s : `/${s}`}`;
}

export default function ProductDetail() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [product, setProduct] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`${BASE_URL}/admin-api/products/${id}`, {
          method: "GET",
          credentials: "include", // ensure cookies/session included for admin endpoints
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          console.error("ProductDetail fetch non-ok response:", res.status, txt);
          throw new Error(`Fetch failed: ${res.status} ${txt}`);
        }

        const data = await res.json();
        if (!cancelled) setProduct(data);
      } catch (err) {
        console.error("ProductDetail load error:", err);
        if (!cancelled) setError("Could not load product details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (id) load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <div style={{ padding: 16 }}>Loading...</div>;
  if (error) return <div style={{ padding: 16, color: "crimson" }}>{error}</div>;
  if (!product) return null;

  // normalize images to array of urls
  const rawImages = Array.isArray(product.images) ? product.images : (product.images ? [product.images] : []);
  const images = rawImages.map(toImageUrl).filter(Boolean);

  return (
    <div style={{ padding: 16 }}>
      <h2>{product.title || "Untitled product"}</h2>

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        <div style={{ minWidth: 240 }}>
          {images.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {images.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`prod-${i}`}
                  style={{ width: 220, height: 300, objectFit: "contain", background: "#fff", border: "1px solid #eee" }}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = PLACEHOLDER;
                  }}
                />
              ))}
            </div>
          ) : (
            <div
              style={{
                width: 220,
                height: 300,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#f5f5f5",
                border: "1px solid #eee",
              }}
            >
              No image
            </div>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <p>
            <strong>Price:</strong> ₹{product.price ?? "—"}
          </p>
          <p>
            <strong>MRP:</strong> {product.mrp ? `₹${product.mrp}` : "—"}
          </p>
          <p>
            <strong>Brand:</strong> {product.brand ?? "—"}
          </p>
          <p>
            <strong>Stock:</strong> {product.stock ?? product.countInStock ?? "—"}
          </p>
          <p>
            <strong>Category:</strong> {product.category ?? "—"}
          </p>
          <p>
            <strong>Slug:</strong> {product.slug ?? "—"}
          </p>

          <div style={{ marginTop: 12 }}>
            <h4>Description</h4>
            <p style={{ whiteSpace: "pre-wrap" }}>{product.description || "—"}</p>
          </div>

          <div style={{ marginTop: 18 }}>
            <Link to={`/admin/products/edit/${id}`}>
              <button>Edit product</button>
            </Link>
            <span style={{ marginLeft: 12 }}>
              <Link to="/admin/products">Back to list</Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
