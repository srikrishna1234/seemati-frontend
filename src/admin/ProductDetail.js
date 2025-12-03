// src/admin/ProductDetail.js
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import colorUtil from "../utils/colorNames"; // expects src/utils/colorNames.js from earlier

const BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  process.env.REACT_APP_API_URL ||
  "https://seemati-backend.onrender.com";
const PLACEHOLDER = "/images/placeholder.png";

function toImageUrl(img) {
  if (!img) return null;
  if (typeof img === "object") {
    const u = img.url || img.path || img.filename || null;
    if (!u) return null;
    if (typeof u === "string" && (u.startsWith("http://") || u.startsWith("https://"))) return u;
    return `${BASE_URL}${u.startsWith("/") ? u : `/${u}`}`;
  }
  const s = String(img).trim();
  if (!s) return null;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("//")) return window.location.protocol + s;
  return `${BASE_URL}${s.startsWith("/") ? s : `/${s}`}`;
}

// Try to extract YouTube embed URL. Return null if not a recognized youtube url.
function youtubeEmbedUrl(raw) {
  if (!raw || typeof raw !== "string") return null;
  const s = raw.trim();
  // common youtube forms:
  // https://www.youtube.com/watch?v=VIDEOID
  // https://youtu.be/VIDEOID
  // https://www.youtube.com/embed/VIDEOID
  try {
    const url = new URL(s, window.location.origin);
    const host = url.hostname.toLowerCase();
    if (host.includes("youtube.com")) {
      if (url.pathname.startsWith("/embed/")) {
        return `https://www.youtube.com${url.pathname}${url.search || ""}`;
      }
      const vid = url.searchParams.get("v");
      if (vid) return `https://www.youtube.com/embed/${vid}`;
    }
    if (host.includes("youtu.be")) {
      const vid = url.pathname.replace("/", "");
      if (vid) return `https://www.youtube.com/embed/${vid}`;
    }
  } catch (err) {
    // not a full URL, maybe just an ID
    const maybeId = s.match(/^[A-Za-z0-9_-]{8,}$/);
    if (maybeId) return `https://www.youtube.com/embed/${maybeId[0]}`;
  }
  return null;
}

export default function ProductDetail() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [product, setProduct] = useState(null);

  // UI state
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`${BASE_URL}/admin-api/products/${id}`, {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          console.error("ProductDetail fetch non-ok response:", res.status, txt);
          throw new Error(`Fetch failed: ${res.status} ${txt}`);
        }

        const data = await res.json();
        if (!cancelled) {
          setProduct(data);
          // derive default selected color (first available)
          const rawColors = Array.isArray(data.colors)
            ? data.colors
            : (data.colors ? String(data.colors).split(",").map(s => s.trim()).filter(Boolean) : []);
          if (rawColors.length > 0) {
            const normalized = colorUtil.normalizeHex(rawColors[0]) || rawColors[0];
            setSelectedColor(normalized);
          } else {
            setSelectedColor(null);
          }
        }
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
  const rawImages = Array.isArray(product.images)
    ? product.images
    : (product.images ? [product.images] : []);
  const images = rawImages.map(toImageUrl).filter(Boolean);

  // colors: accept array or comma-separated string
  const rawColors = Array.isArray(product.colors)
    ? product.colors
    : (product.colors ? String(product.colors).split(",").map(s => s.trim()).filter(Boolean) : []);
  const colors = rawColors.map(c => (colorUtil.normalizeHex(c) || c));

  const embedUrl = youtubeEmbedUrl(product.videoUrl);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>{product.title || "Untitled product"}</h2>

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Left: images */}
        <div style={{ minWidth: 260 }}>
          {images.length > 0 ? (
            <div>
              <div
                style={{
                  width: 320,
                  height: 420,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid #eee",
                  background: "#fff",
                }}
              >
                <img
                  key={images[selectedImageIndex] || "main"}
                  src={images[selectedImageIndex] || PLACEHOLDER}
                  alt={`prod-${selectedImageIndex}`}
                  style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = PLACEHOLDER;
                  }}
                />
              </div>

              {/* thumbnails */}
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                {images.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImageIndex(i)}
                    style={{
                      width: 64,
                      height: 64,
                      padding: 0,
                      border: i === selectedImageIndex ? "2px solid #1A84C7" : "1px solid #ddd",
                      background: "#fff",
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                    aria-label={`View image ${i + 1}`}
                  >
                    <img
                      src={url}
                      alt={`thumb-${i}`}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = PLACEHOLDER;
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div
              style={{
                width: 320,
                height: 420,
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

          {/* video preview below images (if youtube embed available) */}
          {product.videoUrl && (
            <div style={{ marginTop: 14 }}>
              {embedUrl ? (
                <div style={{ width: 320, height: 180, border: "1px solid #eee", borderRadius: 6, overflow: "hidden" }}>
                  <iframe
                    title="Product video"
                    width="100%"
                    height="100%"
                    src={embedUrl}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div style={{ fontSize: 13 }}>
                  <strong>Video:</strong>{" "}
                  <a href={product.videoUrl} target="_blank" rel="noreferrer">
                    Open video
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: details */}
        <div style={{ flex: 1, minWidth: 320 }}>
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

          {/* Colors */}
          {colors && colors.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ marginBottom: 8, fontWeight: 600 }}>Color</div>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                {colors.map((c, idx) => {
                  const hex = colorUtil.normalizeHex(c) || c;
                  const friendly = colorUtil.hexToName(hex) || hex;
                  const isSelected = selectedColor === hex || selectedColor === c;
                  return (
                    <div key={idx} style={{ textAlign: "center", minWidth: 70 }}>
                      <button
                        onClick={() => setSelectedColor(hex)}
                        aria-label={friendly}
                        title={friendly}
                        style={{
                          width: 48,
                          height: 36,
                          borderRadius: 6,
                          border: isSelected ? "2px solid #1A84C7" : "1px solid #ddd",
                          background: hex || "#fff",
                          display: "inline-block",
                          cursor: "pointer",
                        }}
                      />
                      <div style={{ marginTop: 6, fontSize: 13, color: "#222" }}>
                        {friendly}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sizes */}
          {product.sizes && (
            <div style={{ marginTop: 12 }}>
              <div style={{ marginBottom: 8, fontWeight: 600 }}>Size</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {(Array.isArray(product.sizes) ? product.sizes : String(product.sizes || "").split(",").map(s => s.trim()).filter(Boolean)).map((sz, i) => (
                  <div key={i} style={{ border: "1px solid #ddd", padding: "6px 10px", borderRadius: 6 }}>{sz}</div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 18 }}>
            <h4>Description</h4>
            <p style={{ whiteSpace: "pre-wrap" }}>{product.description || "—"}</p>
          </div>

          <div style={{ marginTop: 18 }}>
            <Link to={`/admin/products/${id}/edit`}>
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
