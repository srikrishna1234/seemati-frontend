// src/admin/ProductDetail.js
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

const BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  process.env.REACT_APP_API_URL ||
  "https://seemati-backend.onrender.com";
const PLACEHOLDER = "/images/placeholder.png";

/* -------------------- utilities -------------------- */

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

// normalize a color input (name, hex) into a 6-char hex like #AABBCC
function normalizeHex(raw) {
  if (!raw) return null;
  let s = String(raw).trim();
  // if it's a named color (like "baby pink"), we won't map here — let hex matcher handle common names later
  // if already hex like #abc or abc or 0xabc
  if (s.startsWith("0x")) s = s.slice(2);
  if (s.startsWith("#")) s = s.slice(1);
  s = s.replace(/[^0-9a-fA-F]/g, "");
  if (s.length === 3) {
    // expand
    s = s.split("").map(c => c + c).join("");
  }
  if (s.length === 6) {
    return ("#" + s).toUpperCase();
  }
  return null;
}

// small palette of named colors (common ones) to match against — add more if you want better matches
const NAMED_COLORS = {
  "black": "#000000",
  "white": "#FFFFFF",
  "red": "#FF0000",
  "green": "#008000",
  "blue": "#0000FF",
  "yellow": "#FFFF00",
  "pink": "#FFC0CB",
  "baby pink": "#F4C6D8",
  "teal": "#008B8B",
  "olive": "#808000",
  "navy": "#000080",
  "maroon": "#800000",
  "purple": "#800080",
  "orange": "#FFA500",
  "brown": "#A52A2A",
  "gray": "#808080",
  "lightgray": "#D3D3D3",
  "coral": "#FF7F50",
  "magenta": "#FF00FF",
  "cyan": "#00FFFF",
  "lime": "#00FF00",
  "indigo": "#4B0082",
  "gold": "#FFD700",
  "silver": "#C0C0C0",
  "mustard": "#D2A200"
};

// produce array of {name, hex, rgb}
const _palette = Object.entries(NAMED_COLORS).map(([n, h]) => {
  const r = parseInt(h.slice(1,3),16);
  const g = parseInt(h.slice(3,5),16);
  const b = parseInt(h.slice(5,7),16);
  return { name: n, hex: h.toUpperCase(), r, g, b };
});

// convert hex to nearest friendly name by Euclidean distance in RGB space
function hexToNearestName(hex) {
  if (!hex) return null;
  const h = normalizeHex(hex);
  if (!h) return null;
  const r = parseInt(h.slice(1,3),16);
  const g = parseInt(h.slice(3,5),16);
  const b = parseInt(h.slice(5,7),16);

  let best = null;
  let bestDist = Infinity;
  for (const p of _palette) {
    const dr = p.r - r;
    const dg = p.g - g;
    const db = p.b - b;
    const d = dr*dr + dg*dg + db*db;
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  if (!best) return h;
  // if distance is large, return hex instead of misleading name (threshold chosen somewhat heuristically)
  if (bestDist > (160*160)) return h; // far away -> show hex
  // return capitalized name (e.g. "Baby Pink")
  return best.name.split(" ").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
}

// youtube embed helper - returns embed url or null
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
    // maybe user pasted only ID
    const maybeId = s.match(/^[A-Za-z0-9_-]{8,}$/);
    if (maybeId) return `https://www.youtube.com/embed/${maybeId[0]}`;
  }
  return null;
}

/* -------------------- component -------------------- */

export default function ProductDetail() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [product, setProduct] = useState(null);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(null);

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

        // ADJUSTMENT: some endpoints return { product: {...} } and some return the product directly
        const prod = data && data.product ? data.product : data;

        if (!cancelled) {
          setProduct(prod);

          // derive colors: array or CSV
          const rawColors = Array.isArray(prod.colors)
            ? prod.colors
            : (prod.colors ? String(prod.colors).split(",").map(s => s.trim()).filter(Boolean) : []);

          // choose first color as selected
          if (rawColors.length > 0) {
            // normalize into hex if possible, else keep raw
            const firstHex = normalizeHex(rawColors[0]) || rawColors[0];
            setSelectedColor(firstHex);
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

  // images
  const rawImages = Array.isArray(product.images) ? product.images : (product.images ? [product.images] : []);
  const images = rawImages.map(toImageUrl).filter(Boolean);

  // colors normalized: map each raw value to hex if possible or keep original
  const rawColors = Array.isArray(product.colors)
    ? product.colors
    : (product.colors ? String(product.colors).split(",").map(s => s.trim()).filter(Boolean) : []);
  const colors = rawColors.map(c => {
    const hex = normalizeHex(c);
    return { raw: c, hex: hex, displayHex: hex || null, name: (hex ? hexToNearestName(hex) : (String(c).length <= 8 ? c : c)) };
  });

  // Video embed detection - look for common fields
  const possibleVideo = product.videoUrl || product.video || product.video_url || product.videoLink || product.video_link || "";
  const embedUrl = youtubeEmbedUrl(possibleVideo);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>{product.title || "Untitled product"}</h2>

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Images + video */}
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
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = PLACEHOLDER; }}
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

          {/* Video preview if available */}
          {possibleVideo && (
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
                  <a href={possibleVideo} target="_blank" rel="noreferrer">Open video</a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Details */}
        <div style={{ flex: 1, minWidth: 320 }}>
          <p><strong>Price:</strong> ₹{product.price ?? "—"}</p>
          <p><strong>MRP:</strong> {product.mrp ? `₹${product.mrp}` : "—"}</p>
          <p><strong>Brand:</strong> {product.brand ?? "—"}</p>
          <p><strong>Stock:</strong> {product.stock ?? product.countInStock ?? "—"}</p>
          <p><strong>Category:</strong> {product.category ?? "—"}</p>
          <p><strong>Slug:</strong> {product.slug ?? "—"}</p>

          {/* Colors: show swatches and friendly name */}
          {colors && colors.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ marginBottom: 8, fontWeight: 600 }}>Color</div>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                {colors.map((c, idx) => {
                  const bg = c.displayHex || "#fff";
                  const friendly = c.name || (typeof c.raw === "string" ? c.raw : (c.displayHex || ""));
                  const isSelected = (selectedColor && c.displayHex && selectedColor.toUpperCase() === c.displayHex.toUpperCase()) || (!selectedColor && idx === 0);
                  return (
                    <div key={idx} style={{ textAlign: "center", minWidth: 80 }}>
                      <button
                        onClick={() => setSelectedColor(c.displayHex || c.raw)}
                        aria-label={friendly}
                        title={friendly}
                        style={{
                          width: 48,
                          height: 36,
                          borderRadius: 6,
                          border: isSelected ? "2px solid #1A84C7" : "1px solid #ddd",
                          background: bg,
                          display: "inline-block",
                          cursor: "pointer",
                        }}
                      />
                      <div style={{ marginTop: 6, fontSize: 13, color: "#222" }}>{friendly}</div>
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
            <Link to={`/admin/products/${id}/edit`}><button>Edit product</button></Link>
            <span style={{ marginLeft: 12 }}><Link to="/admin/products">Back to list</Link></span>
          </div>
        </div>
      </div>
    </div>
  );
}
