// src/admin/AddProduct.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";

/**
 * AddProduct: admin "create product" form
 * - color swatches with native color picker (click a swatch to open)
 * - colors input kept in sync with swatches
 * - previews for selected files and upload to backend
 * - video preview (YouTube)
 *
 * Auto behavior added:
 * - auto-slug generated from title (kebab-case) unless slug manually edited
 * - auto-sku generated from brand+category (or fallback prefix KPL) unless sku manually edited
 *
 * API assumptions:
 * - POST /api/products/upload  (multipart/form-data) returns { uploaded: [ {url, key}, ... ] } OR an array
 * - POST /api/products  creates product and returns { success: true, product: {...} } or product object
 *
 * If your backend endpoints differ, adjust the axiosInstance.post URLs below.
 */

// Named color map for suggestions (same-ish list as edit page)
const NAMED_COLORS = {
  white: "#FFFFFF",
  silver: "#C0C0C0",
  gray: "#808080",
  black: "#000000",
  red: "#FF0000",
  maroon: "#800000",
  yellow: "#FFFF00",
  olive: "#808000",
  lime: "#00FF00",
  green: "#008000",
  aqua: "#00FFFF",
  teal: "#008080",
  blue: "#0000FF",
  navy: "#000080",
  fuchsia: "#FF00FF",
  purple: "#800080",
  pink: "#FFC0CB",
  brown: "#A52A2A",
  orange: "#FFA500",
  gold: "#FFD700",
  peach: "#FFDAB9",
  mustard: "#FFDB58",
  coral: "#FF7F50",
  // brand custom examples
  "#1026CB": "blue",
  "#1A84C7": "teal",
  "#E40C0C": "red",
  "#010913": "black",
  "#584141": "brown"
};

// Helpers
function hexToRgb(hex) {
  if (!hex) return null;
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  if (full.length !== 6) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}
function normalizeToHexIfPossible(col) {
  if (!col) return "";
  const t = String(col).trim();
  // hex like #abc or #aabbcc
  if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(t)) {
    const clean = t.replace("#", "");
    const full = clean.length === 3 ? clean.split("").map(c => c + c).join("") : clean;
    return `#${full.toUpperCase()}`;
  }
  const lower = t.toLowerCase();
  if (NAMED_COLORS[lower]) return NAMED_COLORS[lower].toUpperCase();
  // if user passed hex without # like "abc123"
  if (/^[0-9A-Fa-f]{6}$/.test(t)) return `#${t.toUpperCase()}`;
  // fallback: return original string (label)
  return t;
}
function nearestColorName(hex) {
  try {
    const target = hexToRgb(hex);
    if (!target) return hex;
    let best = null;
    let bestDist = Infinity;
    for (const [name, val] of Object.entries(NAMED_COLORS)) {
      const h = normalizeToHexIfPossible(val);
      const rgb = hexToRgb(h);
      if (!rgb) continue;
      const d = (rgb.r - target.r) ** 2 + (rgb.g - target.g) ** 2 + (rgb.b - target.b) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = name;
      }
    }
    if (!best) return hex;
    if (bestDist > 160 * 160) return hex; // too far -> return hex
    return best;
  } catch {
    return hex;
  }
}

function getYouTubeEmbedUrl(raw) {
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
    const maybeId = s.match(/^[A-Za-z0-9_-]{8,}$/);
    if (maybeId) return `https://www.youtube.com/embed/${maybeId[0]}`;
  }
  return null;
}

// slug helper
function makeSlug(text) {
  if (!text) return "";
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "") // remove quotes
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

// sku helper
function sanitizeAlnum(s = "") {
  return String(s || "").replace(/[^a-z0-9]/gi, "").toUpperCase();
}
function generateSku({ brand, category }) {
  // Use first 3 chars of brand and category if available
  const b = sanitizeAlnum(brand || "");
  const c = sanitizeAlnum(category || "");
  let prefix = "KPL"; // fallback prefix
  if (b && c) {
    const pb = b.slice(0, 3);
    const pc = c.slice(0, 3);
    prefix = `${pb}-${pc}`;
  } else if (b) {
    prefix = `${b.slice(0, 3)}`;
  } else if (c) {
    prefix = `${c.slice(0, 3)}`;
  }
  // 3-digit counter from timestamp (low collision risk for quick admin actions)
  const counter = String(Math.abs(Date.now()) % 1000).padStart(3, "0");
  return `${prefix}-${counter}`;
}

export default function AddProduct() {
  const navigate = useNavigate();

  // product fields
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [mrp, setMrp] = useState("");
  const [stock, setStock] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  // Flags to avoid overriding manual edits
  const [slugEdited, setSlugEdited] = useState(false);
  const [skuEdited, setSkuEdited] = useState(false);

  // colors as text input + swatches array synced
  const [colorsInput, setColorsInput] = useState("");
  const [swatches, setSwatches] = useState([]); // array of normalized values (hex or label)
  const colorPickerRef = useRef(null);
  const [colorPickerIndex, setColorPickerIndex] = useState(null);

  // sizes
  const [sizesInput, setSizesInput] = useState("");

  // file selection / upload
  const fileInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]); // { file, previewUrl }
  const [uploadedImages, setUploadedImages] = useState([]); // { filename, url }
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Sync text input -> swatches (when user types)
  useEffect(() => {
    const arr = colorsInput
      ? colorsInput.split(",").map(s => s.trim()).filter(Boolean).map(c => normalizeToHexIfPossible(c))
      : [];
    setSwatches(arr);
  }, [colorsInput]);

  // Keep colorsInput updated when swatches change (so they stay in sync when user uses picker)
  useEffect(() => {
    const s = swatches
      .map(sv => {
        if (!sv) return "";
        // prefer named key if present in NAMED_COLORS
        const lower = String(sv).toLowerCase();
        const found = Object.entries(NAMED_COLORS).find(([, v]) => v.toUpperCase() === String(sv).toUpperCase());
        if (found) return found[0].toUpperCase();
        return sv;
      })
      .filter(Boolean)
      .join(", ");
    setColorsInput(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swatches]);

  // --- Auto-slug and auto-sku effects ---

  // Generate slug from title when title changes unless slug edited manually
  useEffect(() => {
    if (!slugEdited) {
      const s = makeSlug(title);
      setSlug(s);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

  // Generate SKU when brand or category (or title as fallback) changes unless sku edited manually
  useEffect(() => {
    if (!skuEdited) {
      const gen = generateSku({ brand: brand || title, category });
      setSku(gen);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand, category, title]);

  // file selection handler - create previews
  function onFilesChange(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const mapped = files.map((f) => ({ file: f, previewUrl: URL.createObjectURL(f) }));
    setSelectedFiles(prev => [...prev, ...mapped]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeSelectedPreview(idx) {
    setSelectedFiles(prev => {
      const copy = [...prev];
      const removed = copy.splice(idx, 1)[0];
      if (removed && removed.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return copy;
    });
  }

  // Upload selectedFiles to backend; returns array of urls
  async function uploadFilesIfAny() {
    if (!selectedFiles.length) return [];
    const form = new FormData();
    selectedFiles.forEach(s => form.append("files", s.file)); // backend should accept multiple files
    setLoadingUpload(true);
    try {
      const resp = await axiosInstance.post("/api/products/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true
      });
      const data = resp && resp.data ? resp.data : {};
      // normalize returned shapes
      let arr = [];
      if (Array.isArray(data)) arr = data;
      else if (Array.isArray(data.uploaded)) arr = data.uploaded;
      else if (Array.isArray(data.files)) arr = data.files;
      else if (data.url) arr = [data];
      // extract urls
      const urls = arr.map(it => (it && it.url) ? it.url : (typeof it === "string" ? it : null)).filter(Boolean);
      // also store uploadedImages for UI
      const ui = arr.map((it, i) => {
        if (it && it.url) return { filename: it.filename || `img-${i}`, url: it.url };
        if (typeof it === "string") return { filename: `img-${i}`, url: it };
        return null;
      }).filter(Boolean);
      setUploadedImages(prev => [...prev, ...ui]);
      setSelectedFiles([]); // clear previews
      return urls;
    } catch (err) {
      console.error("Upload failed", err);
      throw err;
    } finally {
      setLoadingUpload(false);
    }
  }

  // color picker interactions
  function openColorPickerAtIndex(idx) {
    setColorPickerIndex(idx);
    if (colorPickerRef.current) {
      const cur = swatches[idx] || "#FFFFFF";
      // ensure hex for input; fallback white
      const normalized = /^#([0-9A-Fa-f]{6})$/.test(String(cur)) ? cur : "#FFFFFF";
      colorPickerRef.current.value = normalized;
      colorPickerRef.current.click();
    }
  }
  function onColorPickerChange(e) {
    const val = e.target.value;
    const idx = colorPickerIndex;
    setColorPickerIndex(null);
    if (idx == null) return;
    setSwatches(prev => {
      const copy = [...prev];
      copy[idx] = val.toUpperCase();
      return copy;
    });
  }
  function addSwatch() {
    setSwatches(prev => [...prev, "#FFFFFF"]);
  }
  function removeSwatch(i) {
    setSwatches(prev => prev.filter((_, idx) => idx !== i));
  }

  // Remove uploaded image from list (UI only)
  function removeUploaded(index) {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  }

  // Create product handler
  async function handleCreateProduct(e) {
    e?.preventDefault?.();
    setMessage("");
    setSaving(true);

    try {
      // 1) upload files if any
      let uploadedUrls = [];
      if (selectedFiles.length) {
        uploadedUrls = await uploadFilesIfAny();
        if (uploadedUrls.length === 0) {
          throw new Error("No urls returned from upload");
        }
      }

      // 2) combine uploadedImages (already stored) + uploadedUrls (defensive)
      const finalImageUrls = (uploadedImages && uploadedImages.length) ? uploadedImages.map(i => i.url) : [];
      if (uploadedUrls && uploadedUrls.length) {
        uploadedUrls.forEach(u => {
          if (!finalImageUrls.includes(u)) finalImageUrls.push(u);
        });
      }

      // 3) prepare body
      const body = {
        title,
        slug,
        sku,
        description,
        price: Number(price) || 0,
        mrp: Number(mrp) || 0,
        stock: Number(stock) || 0,
        brand,
        category,
        videoUrl: videoUrl || "",
        colors: swatches.map(s => s), // array of strings (hex or names)
        sizes: sizesInput ? sizesInput.split(",").map(s => s.trim()).filter(Boolean) : [],
        images: finalImageUrls
      };

      const resp = await axiosInstance.post("/api/products", body, { withCredentials: true });
      const data = resp && resp.data ? resp.data : {};
      if (data && (data.success || data._id || data.id || data.product)) {
        setMessage("Product created.");
        // navigate to admin product list or to edit view for the new product
        const created = data.product || data;
        const id = created._id || created.id || created.slug;
        if (id) {
          navigate("/admin/products");
        } else {
          navigate("/admin/products");
        }
      } else {
        console.error("Create product unexpected response", data);
        throw new Error("Create failed, check server response");
      }
    } catch (err) {
      console.error("Create product error", err);
      setMessage("Create failed: " + (err.message || String(err)));
    } finally {
      setSaving(false);
    }
  }

  // Video embed url for preview
  const embedUrl = getYouTubeEmbedUrl(videoUrl);

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 12 }}>
        <button type="button" onClick={() => navigate("/admin/products")} style={{ padding: "6px 10px" }}>
          Back to products
        </button>
      </div>

      <h1>Add New Product</h1>

      <form onSubmit={handleCreateProduct}>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: "block", marginBottom: 4 }}>Title</label>
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
            }}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ display: "block", marginBottom: 4 }}>Slug</label>
          <input
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugEdited(true); // manual override
            }}
            placeholder="example-product-slug"
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", marginBottom: 4 }}>Price (₹)</label>
            <input value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", marginBottom: 4 }}>MRP (₹)</label>
            <input value={mrp} onChange={(e) => setMrp(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", marginBottom: 4 }}>Stock</label>
            <input value={stock} onChange={(e) => setStock(e.target.value)} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", marginBottom: 4 }}>SKU</label>
            <input
              value={sku}
              onChange={(e) => {
                setSku(e.target.value);
                setSkuEdited(true);
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", marginBottom: 4 }}>Brand</label>
            <input
              value={brand}
              onChange={(e) => {
                setBrand(e.target.value);
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", marginBottom: 4 }}>Category</label>
            <input
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
              }}
            />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ display: "block", marginBottom: 4 }}>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} style={{ width: "100%" }} />
        </div>

        {/* Colors: text input + swatches (editable with color picker) */}
        <div style={{ marginTop: 12 }}>
          <label style={{ display: "block", marginBottom: 6 }}>Colors (comma-separated)</label>
          <input value={colorsInput} onChange={(e) => setColorsInput(e.target.value)} placeholder="#1026CB, #1A84C7, red" style={{ width: "100%" }} />
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
            {swatches.map((c, i) => {
              const isHex = /^#([0-9A-Fa-f]{6})$/.test(String(c).trim());
              const bg = isHex ? c : "#EEE";
              const suggested = isHex ? (nearestColorName(c) || c) : c;
              return (
                <div key={i} style={{ textAlign: "center", minWidth: 72 }}>
                  <div
                    title={String(c)}
                    onClick={() => openColorPickerAtIndex(i)}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 6,
                      border: "1px solid #ccc",
                      boxShadow: "0 1px 6px rgba(0,0,0,0.12)",
                      background: bg,
                      cursor: "pointer"
                    }}
                  />
                  <div style={{ fontSize: 12, marginTop: 6, maxWidth: 80, wordBreak: "break-word" }}>
                    {suggested}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <button type="button" onClick={() => removeSwatch(i)}>Remove</button>
                  </div>
                </div>
              );
            })}

            <div style={{ display: "flex", alignItems: "center" }}>
              <button type="button" onClick={addSwatch}>+ Add color</button>
            </div>

            {/* hidden color input */}
            <input ref={colorPickerRef} type="color" style={{ display: "none" }} onChange={onColorPickerChange} aria-hidden />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ display: "block", marginBottom: 4 }}>Sizes (comma separated)</label>
          <input value={sizesInput} onChange={(e) => setSizesInput(e.target.value)} placeholder="L, XL, XXL" style={{ width: "100%" }} />
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ display: "block", marginBottom: 4 }}>Video URL (YouTube)</label>
          <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} style={{ width: "100%" }} />
          <div style={{ fontSize: 12, color: "#555", marginTop: 6 }}>
            Paste YouTube link (example: https://youtu.be/VIDEOID or https://www.youtube.com/watch?v=VIDEOID)
          </div>

          {/* video preview */}
          <div style={{ marginTop: 12 }}>
            {videoUrl ? (
              embedUrl ? (
                <div style={{ width: 420, maxWidth: "100%", height: 220, border: "1px solid #eee", borderRadius: 6, overflow: "hidden" }}>
                  <iframe title="video-preview" width="100%" height="100%" src={embedUrl} frameBorder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                </div>
              ) : (
                <div style={{ color: "#666" }}>Unsupported video URL for inline preview (only YouTube links are embedded).</div>
              )
            ) : (
              <div style={{ color: "#666" }}>No video URL provided</div>
            )}
          </div>
        </div>

        <hr style={{ margin: "12px 0" }} />

        {/* Images */}
        <div>
          <label style={{ display: "block", marginBottom: 6 }}>Images (select one or more)</label>
          <div style={{ margin: "8px 0" }}>
            <input ref={fileInputRef} type="file" multiple onChange={onFilesChange} />
            <button type="button" onClick={uploadFilesIfAny} disabled={loadingUpload} style={{ marginLeft: 8 }}>
              {loadingUpload ? "Uploading…" : "Upload selected"}
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            {selectedFiles.map((s, idx) => (
              <div key={s.previewUrl + idx} style={{ border: "1px solid #eee", padding: 6, borderRadius: 6 }}>
                <img src={s.previewUrl} alt={`preview-${idx}`} style={{ width: 120, height: 120, objectFit: "cover" }} />
                <div style={{ marginTop: 6 }}>
                  <button type="button" onClick={() => removeSelectedPreview(idx)}>Remove</button>
                </div>
              </div>
            ))}

            {uploadedImages.map((img, idx) => (
              <div key={`up-${idx}`} style={{ border: "1px solid #eee", padding: 6, borderRadius: 6 }}>
                <img src={img.url} alt={img.filename} style={{ width: 120, height: 120, objectFit: "cover" }} />
                <div style={{ marginTop: 6 }}>
                  <button type="button" onClick={() => removeUploaded(idx)}>Remove</button>
                </div>
              </div>
            ))}

            {!selectedFiles.length && uploadedImages.length === 0 && <div style={{ color: "#666" }}>No files chosen</div>}
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <button type="submit" disabled={saving}>{saving ? "Saving..." : "Create Product"}</button>
          <button type="button" onClick={() => navigate(-1)} style={{ marginLeft: 10 }}>Cancel</button>
        </div>
      </form>

      {message && <div style={{ marginTop: 12, color: "crimson", whiteSpace: "pre-wrap" }}>{message}</div>}
    </div>
  );
}
