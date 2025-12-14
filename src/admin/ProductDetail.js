// src/admin/ProductDetail.js
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import colorNames from "../utils/colorNames";

const PLACEHOLDER = "/images/placeholder.png";

/* -------------------- utilities -------------------- */

function normalizeHex(raw) {
  if (!raw) return null;
  let s = String(raw).trim();
  if (s.startsWith("0x")) s = s.slice(2);
  if (s.startsWith("#")) s = s.slice(1);
  s = s.replace(/[^0-9a-fA-F]/g, "");
  if (s.length === 3) s = s.split("").map(c => c + c).join("");
  if (s.length === 6) return ("#" + s).toUpperCase();
  return null;
}

function youtubeEmbedUrl(raw) {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (u.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
  } catch {}
  return null;
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

        // ✅ ONLY SOURCE OF TRUTH
        const res = await axiosInstance.get(
          `/api/admin/products/products/${id}`
        );

        const prod = res.data;
        if (!prod) throw new Error("Product not found");

        const images = Array.isArray(prod.images) ? prod.images : [];
        const colorsRaw = Array.isArray(prod.colors) ? prod.colors : [];
        const sizes =
          Array.isArray(prod.sizes) ? prod.sizes : [];

        if (!cancelled) {
          setProduct({
            ...prod,
            _images: images,
            _colors: colorsRaw,
            _sizes: sizes
          });
          setSelectedImageIndex(0);
          setSelectedColorIndex(0);
        }
      } catch (err) {
        console.error("ProductDetail load error:", err);
        if (!cancelled) setError("Failed to load product");
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

  const images = product._images || [];
  const colors = (product._colors || []).map(c => {
    const hex = normalizeHex(c.hex || c);
    return {
      hex,
      name: c.name || (hex ? colorNames.hexToName(hex) : "")
    };
  });

  const sizes = product._sizes || [];
  const videoUrl = product.videoUrl;
  const embedUrl = youtubeEmbedUrl(videoUrl);

  const mainImage =
    images[selectedImageIndex] || images[0] || PLACEHOLDER;

  return (
    <div style={{ padding: 16 }}>
      <h2>{product.title}</h2>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {/* LEFT */}
        <div>
          <div
            style={{
              width: 360,
              height: 460,
              border: "1px solid #eee",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <img
              src={mainImage}
              alt=""
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
              onError={e => (e.currentTarget.src = PLACEHOLDER)}
            />
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            {images.map((img, i) => (
              <img
                key={i}
                src={img}
                alt=""
                width={64}
                height={64}
                style={{
                  border:
                    i === selectedImageIndex
                      ? "2px solid #1A84C7"
                      : "1px solid #ddd",
                  cursor: "pointer"
                }}
                onClick={() => setSelectedImageIndex(i)}
              />
            ))}
          </div>

          {embedUrl && (
            <div style={{ marginTop: 16 }}>
              <iframe
                title="video"
                width="360"
                height="200"
                src={embedUrl}
                allowFullScreen
              />
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div style={{ minWidth: 300 }}>
          <p><b>Price:</b> ₹{product.price}</p>
          <p><b>MRP:</b> ₹{product.mrp}</p>
          <p><b>Brand:</b> {product.brand}</p>
          <p><b>Stock:</b> {product.stock}</p>
          <p><b>Category:</b> {product.category}</p>

          {/* COLORS */}
          {colors.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <b>Colors</b>
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                {colors.map((c, i) => (
                  <div key={i} style={{ textAlign: "center" }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        background: c.hex,
                        border:
                          i === selectedColorIndex
                            ? "2px solid #1A84C7"
                            : "1px solid #ccc",
                        cursor: "pointer"
                      }}
                      onClick={() => setSelectedColorIndex(i)}
                    />
                    <div style={{ fontSize: 12 }}>{c.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SIZES */}
          {sizes.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <b>Sizes</b>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {sizes.map(s => (
                  <div key={s} style={{ border: "1px solid #ddd", padding: "4px 8px" }}>
                    {s}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <h4>Description</h4>
            <p>{product.description}</p>
          </div>

          <div style={{ marginTop: 16 }}>
            <Link to={`/admin/products/edit/${id}`}>
              <button>Edit</button>
            </Link>{" "}
            <Link to="/admin/products">Back</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
