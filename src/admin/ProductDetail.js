// src/admin/ProductDetail.js
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import colorNames from "../utils/colorNames"; // uses hexToName / formatColorName

const BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  process.env.REACT_APP_API_URL ||
  "https://seemati-backend.onrender.com";
const PLACEHOLDER = "/images/placeholder.png";

/* -------------------- utilities -------------------- */

function toImageUrl(img) {
  if (!img) return null;
  if (typeof img === "object") {
    const u = img.url || img.path || img.filename || img.src || null;
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

function normalizeHex(raw) {
  if (!raw) return null;
  let s = String(raw).trim();
  if (s.startsWith("0x")) s = s.slice(2);
  if (s.startsWith("#")) s = s.slice(1);
  s = s.replace(/[^0-9a-fA-F]/g, "");
  if (s.length === 3) s = s.split("").map((c) => c + c).join("");
  if (s.length === 6) return ("#" + s).toUpperCase();
  return null;
}

function youtubeEmbedUrl(raw) {
  if (!raw || typeof raw !== "string") return null;
  const s = raw.trim();
  try {
    const url = new URL(s, window.location.origin);
    const host = url.hostname.toLowerCase();
    if (host.includes("youtube.com")) {
      if (url.pathname.startsWith("/embed/")) return `https://www.youtube.com${url.pathname}${url.search || ""}`;
      const vid = url.searchParams.get("v");
      if (vid) return `https://www.youtube.com/embed/${vid}`;
    }
    if (host.includes("youtu.be")) {
      const vid = url.pathname.replace("/", "");
      if (vid) return `https://www.youtube.com/embed/${vid}`;
    }
  } catch (err) {
    // treat raw as possible id
    const maybeId = s.match(/^[A-Za-z0-9_-]{8,}$/);
    if (maybeId) return `https://www.youtube.com/embed/${maybeId[0]}`;
  }
  return null;
}

function isDirectVideoUrl(u) {
  if (!u || typeof u !== "string") return false;
  const lower = u.toLowerCase();
  return lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".ogg");
}

/* -------------------- component -------------------- */

export default function ProductDetail() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [product, setProduct] = useState(null);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);

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
        const prod = data && data.product ? data.product : data;

        if (!prod) {
          if (!cancelled) {
            setError("Product not found.");
            setProduct(null);
            setLoading(false);
          }
          return;
        }

        // normalize images
        const imgsRaw = Array.isArray(prod.images) ? prod.images : prod.images ? [prod.images] : [];
        const imgs = imgsRaw.map(toImageUrl).filter(Boolean);

        // derive raw color list (array or CSV string)
        const rawColors = Array.isArray(prod.colors)
          ? prod.colors
          : prod.colors
          ? String(prod.colors).split(",").map((s) => s.trim()).filter(Boolean)
          : [];

        // normalize color->image mapping if present
        // Accept multiple shapes: array [{ name, image }] or object { "Baby Pink": "url" }
        const colorImageMap = {};
        const rawColorImgs =
          prod.colorImages ||
          prod.color_image_map ||
          prod.color_map ||
          prod.colorImagesMap ||
          prod.colorImagesObj ||
          prod.colorImageMap ||
          null;

        if (rawColorImgs) {
          if (Array.isArray(rawColorImgs)) {
            rawColorImgs.forEach((ci) => {
              if (!ci) return;
              const name = (ci.name || ci.label || ci.color || "").toString().trim().toLowerCase();
              const img = ci.image || ci.url || ci.src || ci.path || null;
              if (name && img) colorImageMap[name] = toImageUrl(img);
            });
          } else if (typeof rawColorImgs === "object") {
            Object.entries(rawColorImgs).forEach(([k, v]) => {
              const name = String(k).trim().toLowerCase();
              const img = typeof v === "string" ? v : (v && (v.url || v.image || v.src || v.path));
              if (name && img) colorImageMap[name] = toImageUrl(img);
            });
          }
        }

        if (!cancelled) {
          setProduct({
            ...prod,
            _normalizedImages: imgs,
            _rawColors: rawColors,
            _colorImageMap: colorImageMap,
          });
          setSelectedImageIndex(0);
          setSelectedColorIndex(0);
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

  // images
  const images = Array.isArray(product._normalizedImages) ? product._normalizedImages : [];

  // build colors array with fields: { raw, hex, displayHex, friendlyName, imageUrl }
  const colors = (Array.isArray(product._rawColors) ? product._rawColors : []).map((rawValue) => {
    const raw = rawValue;
    const hex = normalizeHex(raw);
    const displayHex = hex || null;
    // Try to use your colorNames util for friendly name when hex available
    const friendly = displayHex ? colorNames.hexToName(displayHex) : (String(raw || "").length <= 30 ? String(raw) : String(raw).slice(0, 20));
    // get image from map (case-insensitive)
    const candidate =
      (product._colorImageMap && (product._colorImageMap[String(raw).toLowerCase()] || product._colorImageMap[String(friendly).toLowerCase()])) ||
      null;
    const imageUrl = candidate ? candidate : null;
    return { raw, hex, displayHex, friendlyName: friendly, imageUrl };
  });

  const possibleVideo =
    product.videoUrl || product.video || product.video_url || product.videoLink || product.video_link || product.productVideo || "";
  const embedUrl = youtubeEmbedUrl(possibleVideo);

  // sizes
  const sizes = Array.isArray(product.sizes)
    ? product.sizes
    : product.sizes
    ? String(product.sizes).split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  function handleThumbnailClick(i) {
    setSelectedImageIndex(i);
  }

  function handleColorClick(idx) {
    setSelectedColorIndex(idx);
    const c = colors[idx];
    if (c && c.imageUrl) {
      const idxInImages = images.findIndex((u) => u === c.imageUrl);
      if (idxInImages >= 0) {
        setSelectedImageIndex(idxInImages);
      } else {
        setSelectedImageIndex(-1); // special state to show color image directly
      }
    }
  }

  function getMainImageUrl() {
    if (selectedImageIndex === -1) {
      const c = colors[selectedColorIndex];
      if (c && c.imageUrl) return c.imageUrl;
    }
    return images[selectedImageIndex] || images[0] || PLACEHOLDER;
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>{product.title || product.name || "Untitled product"}</h2>

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Images + video */}
        <div style={{ minWidth: 260 }}>
          <div
            style={{
              width: 360,
              height: 460,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid #eee",
              background: "#fff",
              borderRadius: 8,
            }}
          >
            <img
              key={getMainImageUrl()}
              src={getMainImageUrl()}
              alt={`product-main`}
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = PLACEHOLDER;
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            {images.map((url, i) => (
              <button
                key={i}
                onClick={() => handleThumbnailClick(i)}
                style={{
                  width: 64,
                  height: 64,
                  padding: 0,
                  border: i === selectedImageIndex ? "2px solid #1A84C7" : "1px solid #ddd",
                  background: "#fff",
                  borderRadius: 6,
                  cursor: "pointer",
                  overflow: "hidden",
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

            {/* color-specific thumbnails (only those not already in images list) */}
            {colors.map((c, i) => {
              if (!c.imageUrl) return null;
              const exists = images.includes(c.imageUrl);
              if (exists) return null;
              return (
                <button
                  key={`color-thumb-${i}`}
                  onClick={() => {
                    setSelectedImageIndex(-1);
                    setSelectedColorIndex(i);
                  }}
                  title={c.friendlyName || c.raw}
                  style={{
                    width: 64,
                    height: 64,
                    padding: 0,
                    border: selectedImageIndex === -1 && selectedColorIndex === i ? "2px solid #1A84C7" : "1px solid #ddd",
                    background: "#fff",
                    borderRadius: 6,
                    cursor: "pointer",
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={c.imageUrl}
                    alt={`color-${i}`}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = PLACEHOLDER;
                    }}
                  />
                </button>
              );
            })}

            {/* video tile */}
            {possibleVideo && (
              <div
                onClick={() => {
                  const el = document.getElementById("admin-product-video-player");
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
                title="Product video"
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 6,
                  border: "1px solid #eee",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  background: "#fafafa",
                }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M5 3v18l15-9L5 3z" fill="currentColor" />
                </svg>
              </div>
            )}
          </div>

          {/* Video preview area */}
          {possibleVideo && (
            <div id="admin-product-video-player" style={{ marginTop: 14 }}>
              {youtubeEmbedUrl(possibleVideo) ? (
                <div style={{ width: 360, height: 210, border: "1px solid #eee", borderRadius: 6, overflow: "hidden" }}>
                  <iframe
                    title="Product video"
                    width="100%"
                    height="100%"
                    src={youtubeEmbedUrl(possibleVideo)}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : isDirectVideoUrl(possibleVideo) ? (
                <div style={{ width: 360, border: "1px solid #eee", borderRadius: 6, overflow: "hidden" }}>
                  <video controls style={{ width: "100%", height: "100%" }}>
                    <source src={possibleVideo} />
                    Your browser does not support the video tag.
                  </video>
                </div>
              ) : (
                <div style={{ fontSize: 13 }}>
                  <strong>Video:</strong>{" "}
                  <a href={possibleVideo} target="_blank" rel="noreferrer">
                    Open video
                  </a>{" "}
                  (YouTube links will be embedded)
                </div>
              )}
            </div>
          )}
        </div>

        {/* Details */}
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

          {/* Colors: show swatches and friendly name */}
          {colors && colors.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ marginBottom: 8, fontWeight: 600 }}>Color</div>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                {colors.map((c, idx) => {
                  const bg = c.displayHex || (c.imageUrl ? "#fff" : "#fff");
                  const friendly = c.friendlyName || (typeof c.raw === "string" ? c.raw : c.displayHex || "");
                  const isSelected = selectedColorIndex === idx;
                  return (
                    <div key={idx} style={{ textAlign: "center", minWidth: 90 }}>
                      <button
                        onClick={() => handleColorClick(idx)}
                        aria-label={friendly}
                        title={friendly}
                        style={{
                          width: 48,
                          height: 36,
                          borderRadius: 6,
                          border: isSelected ? "2px solid #1A84C7" : "1px solid #ddd",
                          background: bg,
                          backgroundImage: c.imageUrl && !c.displayHex ? `url(${c.imageUrl})` : undefined,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          display: "inline-block",
                          cursor: "pointer",
                        }}
                      />
                      <div style={{ marginTop: 6, fontSize: 13, color: "#222", maxWidth: 90, wordBreak: "break-word" }}>
                        {friendly}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sizes */}
          {sizes && sizes.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ marginBottom: 8, fontWeight: 600 }}>Size</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {sizes.map((sz, i) => (
                  <div key={i} style={{ border: "1px solid #ddd", padding: "6px 10px", borderRadius: 6 }}>
                    {sz}
                  </div>
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
