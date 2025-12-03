// src/admin/AddProduct.js
import React, { useState, useRef } from "react";
import axios from "axios";
import axiosInstance from "../api/axiosInstance"; // your centralized axios instance
import { useNavigate } from "react-router-dom";

/**
 * Admin Add Product page
 * - full form fields
 * - color swatch preview and click-to-insert behavior
 * - image upload (optional / best-effort)
 *
 * Usage: place at src/admin/AddProduct.js (replace existing file)
 */

const defaultForm = {
  title: "",
  slug: "",
  price: "",
  mrp: "",
  stock: "",
  sku: "",
  brand: "SEEMATI",
  category: "PANTS",
  videoUrl: "",
  colors: "", // comma-separated
  sizes: "", // comma-separated
  description: "",
  images: [], // urls returned from upload
};

function normalizeColorToken(token) {
  // return trimmed token (we will attempt to use it directly as CSS)
  return token.trim();
}

function parseColors(colorsString) {
  if (!colorsString) return [];
  return colorsString
    .split(",")
    .map((t) => normalizeColorToken(t))
    .filter(Boolean);
}

export default function AddProduct() {
  const [form, setForm] = useState(defaultForm);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [localFiles, setLocalFiles] = useState([]);
  const fileRef = useRef(null);
  const navigate = useNavigate();

  // derived
  const colorTokens = parseColors(form.colors);

  // helpers
  function updateField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleUploadFiles(files) {
    if (!files || files.length === 0) return [];

    setUploading(true);
    setError(null);

    const uploadedUrls = [];

    try {
      // Try known backend endpoints in order. If not present, the server will 404 and we'll fallback.
      const uploadCandidates = [
        "/api/products/upload",
        "/api/upload",
        "/upload"
      ];

      // Build FormData for each file and post one-by-one to a working endpoint (safer)
      for (let file of files) {
        // try endpoints sequentially until one works
        let got = false;
        for (const ep of uploadCandidates) {
          try {
            // If axiosInstance.baseURL set, axiosInstance will prepend it
            const formData = new FormData();
            formData.append("file", file);
            // If your backend expects 'image' or other field name, adapt here.
            const res = await axiosInstance.post(ep, formData, {
              headers: { "Content-Type": "multipart/form-data" },
            });
            // Expect response contains {url: 'https://...'} or data.url
            const url = res?.data?.url || res?.data?.file || res?.data?.path || null;
            if (url) {
              uploadedUrls.push(url);
              got = true;
              break;
            } else {
              // If the response is the whole object, try to detect plausible string
              if (typeof res?.data === "string" && res.data.startsWith("http")) {
                uploadedUrls.push(res.data);
                got = true;
                break;
              }
            }
          } catch (e) {
            // noop: try next endpoint
            // eslint-disable-next-line no-console
            console.warn("upload try failed for", ep, e && e.message ? e.message : e);
          }
        }

        if (!got) {
          // last resort: try direct upload to Render origin if you support it (not implemented)
          // We'll throw an error to inform the admin
          throw new Error("Upload endpoint not found or upload failed for one or more files.");
        }
      }
    } catch (err) {
      setError("Image upload failed: " + (err.message || "unknown error"));
      setUploading(false);
      return [];
    }

    setUploading(false);
    return uploadedUrls;
  }

  async function handleFilesSelected(e) {
    const files = Array.from(e.target.files || []);
    setLocalFiles(files);
  }

  async function handleUploadButton() {
    if (!localFiles.length) {
      setMessage("No files chosen.");
      return;
    }
    setMessage("Uploading...");
    setError(null);
    const urls = await handleUploadFiles(localFiles);
    if (urls.length) {
      setForm((f) => ({ ...f, images: [...f.images, ...urls] }));
      setMessage(`${urls.length} file(s) uploaded.`);
      setLocalFiles([]);
      if (fileRef.current) fileRef.current.value = null;
    } else {
      setMessage(null);
    }
  }

  function handleSwatchClick(token) {
    // when clicking a swatch, ensure the corresponding token is present in the colors input
    const tokens = parseColors(form.colors);
    const norm = token.trim();
    // if already in colors, keep it; but we'll highlight by setting the input to that token (helpful)
    // We will set the colors input to the clicked token + existing tokens (ensure uniqueness)
    const setTokens = Array.from(new Set([norm, ...tokens.filter(Boolean)]));
    setForm((f) => ({ ...f, colors: setTokens.join(", ") }));
    // optional: copy to clipboard (commented out)
    // navigator.clipboard && navigator.clipboard.writeText(norm);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    // Basic validation
    if (!form.title) {
      setError("Please enter product title.");
      return;
    }
    // If there are local files not uploaded yet, attempt to upload
    if (localFiles.length) {
      setMessage("Uploading files before creating product...");
      const urls = await handleUploadFiles(localFiles);
      setForm((f) => ({ ...f, images: [...f.images, ...urls] }));
    }

    // Prepare payload
    const payload = {
      title: form.title,
      slug: form.slug || form.title,
      price: Number(form.price || 0),
      mrp: Number(form.mrp || 0),
      stock: Number(form.stock || 0),
      sku: form.sku || "",
      brand: form.brand || "",
      category: form.category || "",
      videoUrl: form.videoUrl || "",
      colors: parseColors(form.colors),
      sizes: form.sizes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      description: form.description || "",
      images: form.images || [],
    };

    try {
      const res = await axiosInstance.post("/api/products", payload);
      setMessage("Product created successfully.");
      setError(null);
      // Optionally navigate to admin product list or product detail
      const newId = res?.data?._id || res?.data?.id || null;
      if (newId) {
        navigate(`/admin/products/${newId}`);
      } else {
        // reset form
        setForm(defaultForm);
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to create product. See console for details."
      );
      // eslint-disable-next-line no-console
      console.error("Create product error:", err);
    }
  }

  function removeImageAt(index) {
    setForm((f) => {
      const images = [...(f.images || [])];
      images.splice(index, 1);
      return { ...f, images };
    });
  }

  return (
    <div style={{ maxWidth: 980, margin: "24px auto", padding: 16 }}>
      <button onClick={() => navigate("/admin/products")} style={{ marginBottom: 16 }}>
        ← Back to products
      </button>

      <h1 style={{ marginTop: 0 }}>Add New Product</h1>

      {message && <div style={{ padding: 10, background: "#e6ffed", borderRadius: 6 }}>{message}</div>}
      {error && (
        <div style={{ padding: 10, background: "#ffe6e6", borderRadius: 6, color: "#a00" }}>{error}</div>
      )}

      <form onSubmit={handleSubmit} style={{ marginTop: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label>
            <div>Product Title</div>
            <input
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="KURTI PANT"
              style={{ width: "100%", padding: 8 }}
            />
          </label>

          <label>
            <div>Slug</div>
            <input
              value={form.slug}
              onChange={(e) => updateField("slug", e.target.value)}
              placeholder="Optional - default from title"
              style={{ width: "100%", padding: 8 }}
            />
          </label>

          <label>
            <div>Price (₹)</div>
            <input
              value={form.price}
              onChange={(e) => updateField("price", e.target.value)}
              style={{ width: "100%", padding: 8 }}
              type="number"
              min="0"
            />
          </label>

          <label>
            <div>MRP (₹)</div>
            <input
              value={form.mrp}
              onChange={(e) => updateField("mrp", e.target.value)}
              style={{ width: "100%", padding: 8 }}
              type="number"
              min="0"
            />
          </label>

          <label>
            <div>Stock Quantity</div>
            <input
              value={form.stock}
              onChange={(e) => updateField("stock", e.target.value)}
              style={{ width: "100%", padding: 8 }}
              type="number"
              min="0"
            />
          </label>

          <label>
            <div>SKU</div>
            <input
              value={form.sku}
              onChange={(e) => updateField("sku", e.target.value)}
              style={{ width: "100%", padding: 8 }}
            />
          </label>

          <label>
            <div>Brand</div>
            <input
              value={form.brand}
              onChange={(e) => updateField("brand", e.target.value)}
              style={{ width: "100%", padding: 8 }}
            />
          </label>

          <label>
            <div>Category</div>
            <input
              value={form.category}
              onChange={(e) => updateField("category", e.target.value)}
              placeholder="PANTS"
              style={{ width: "100%", padding: 8 }}
            />
          </label>
        </div>

        <div style={{ marginTop: 12 }}>
          <label>
            <div>Video URL</div>
            <input
              value={form.videoUrl}
              onChange={(e) => updateField("videoUrl", e.target.value)}
              placeholder="https://youtube.com/..."
              style={{ width: "100%", padding: 8 }}
            />
          </label>
        </div>

        <div style={{ marginTop: 12 }}>
          <label>
            <div>Colors (comma separated) — type names or hex (e.g. baby pink, #ff1493, black)</div>
            <input
              value={form.colors}
              onChange={(e) => updateField("colors", e.target.value)}
              placeholder="BABY PINK, BLACK, DARK"
              style={{ width: "100%", padding: 8 }}
            />
          </label>

          {/* color swatches */}
          <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {colorTokens.length === 0 && (
              <div style={{ color: "#666", fontSize: 13 }}>No colors yet — type color names and press comma</div>
            )}
            {colorTokens.map((tok, idx) => {
              const safe = tok || "";
              // render a swatch box; try to use token as CSS color
              const style = {
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 44,
                minHeight: 28,
                borderRadius: 4,
                border: "1px solid #ddd",
                cursor: "pointer",
                padding: "4px 8px",
                background: safe,
                color: "#000",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              };
              // If token is not a valid color, fall back to neutral background and show label
              // We'll detect invalid color by trying to set it on a temporary element
              let isValidColor = true;
              try {
                const s = new Option().style;
                s.color = safe;
                if (!s.color) isValidColor = false;
              } catch (e) {
                isValidColor = false;
              }

              return (
                <div
                  key={idx}
                  onClick={() => handleSwatchClick(tok)}
                  title={`Click to select "${tok}"`}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 28,
                      borderRadius: 4,
                      border: "1px solid #ddd",
                      background: isValidColor ? safe : "#f5f5f5",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {!isValidColor && (
                      <span style={{ fontSize: 10, color: "#555", padding: "0 4px", textAlign: "center" }}>
                        {tok}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12 }}>{tok}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label>
            <div>Sizes (comma separated)</div>
            <input
              value={form.sizes}
              onChange={(e) => updateField("sizes", e.target.value)}
              placeholder="L, XL, XXL"
              style={{ width: "100%", padding: 8 }}
            />
          </label>
        </div>

        <div style={{ marginTop: 12 }}>
          <label>
            <div>Description</div>
            <textarea
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              rows={6}
              style={{ width: "100%", padding: 8 }}
            />
          </label>
        </div>

        {/* Image upload */}
        <div style={{ marginTop: 12 }}>
          <div style={{ marginBottom: 6 }}>Images (select one or more)</div>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFilesSelected} />
          <button type="button" onClick={handleUploadButton} disabled={uploading} style={{ marginLeft: 8 }}>
            Upload
          </button>
          {localFiles.length > 0 && (
            <div style={{ marginTop: 8, color: "#333" }}>
              {localFiles.map((f, i) => (
                <div key={i} style={{ fontSize: 13 }}>
                  {f.name} ({Math.round(f.size / 1024)} KB)
                </div>
              ))}
            </div>
          )}

          {/* Existing uploaded images preview */}
          {form.images && form.images.length > 0 && (
            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {form.images.map((u, i) => (
                <div key={i} style={{ position: "relative", width: 120 }}>
                  <img
                    src={u}
                    alt={`img-${i}`}
                    style={{ width: "120px", height: "120px", objectFit: "cover", borderRadius: 6 }}
                    onError={(e) => (e.target.style.display = "none")}
                  />
                  <button
                    type="button"
                    onClick={() => removeImageAt(i)}
                    style={{
                      position: "absolute",
                      right: 4,
                      top: 4,
                      background: "rgba(0,0,0,0.6)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      padding: "2px 6px",
                      cursor: "pointer",
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: 18 }}>
          <button type="submit" style={{ padding: "8px 14px", marginRight: 8 }}>
            Create Product
          </button>
          <button
            type="button"
            onClick={() => {
              setForm(defaultForm);
              setLocalFiles([]);
              if (fileRef.current) fileRef.current.value = null;
            }}
            style={{ padding: "8px 14px" }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
