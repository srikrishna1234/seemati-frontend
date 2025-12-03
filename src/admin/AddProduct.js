// src/admin/AddProduct.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const ADMIN_TOKEN = process.env.REACT_APP_ADMIN_TOKEN || "seemati123";
const API_BASE = process.env.REACT_APP_API_URL || ""; // empty => relative paths in dev

export default function AddProduct() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [mrp, setMrp] = useState("");
  const [stock, setStock] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [colors, setColors] = useState("");
  const [sizes, setSizes] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [files, setFiles] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]); // array of { filename, url }
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function onFilesChange(e) {
    setFiles(Array.from(e.target.files || []));
  }

  async function handleUploadFiles() {
    if (!files.length) return setMessage("No files selected for upload.");
    setMessage("");
    setLoading(true);
    try {
      const form = new FormData();
      files.forEach((f) => form.append("file", f));
      const url = API_BASE ? `${API_BASE}/admin-api/products/upload` : "/admin-api/products/upload";
      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: {
          "Authorization": `Bearer ${ADMIN_TOKEN}`,
        },
        body: form,
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Upload failed: ${res.status} ${txt}`);
      }
      const body = await res.json();
      // body is expected to be an array like [{ filename, url, size }, ...]
      setUploadedImages((prev) => prev.concat(body));
      setFiles([]); // clear input selection
      setMessage("Upload successful.");
    } catch (err) {
      console.error("upload error", err);
      setMessage("Upload failed: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProduct(e) {
    e.preventDefault();
    setMessage("");
    // Build product payload. Use uploadedImages' URLs if present.
    const images = uploadedImages.map((i) => i.url);
    const payload = {
      title,
      slug,
      sku,
      description,
      price: Number(price) || 0,
      mrp: Number(mrp) || 0,
      stock: Number(stock) || 0,
      brand,
      category,
      colors: colors ? colors.split(",").map((c) => c.trim()).filter(Boolean) : [],
      sizes: sizes ? sizes.split(",").map((s) => s.trim()).filter(Boolean) : [],
      videoUrl: videoUrl || "",
      images,
    };

    try {
      const url = API_BASE ? `${API_BASE}/admin-api/products` : "/admin-api/products";
      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ADMIN_TOKEN}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Create failed: ${res.status} ${txt}`);
      }
      const data = await res.json();
      setMessage("Product created.");
      // navigate back to admin list or open edit
      navigate("/admin/products");
    } catch (err) {
      console.error("create error", err);
      setMessage("Create failed: " + (err.message || err));
    }
  }

  function removeUploaded(index) {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  }

  // Helper to render color swatches from the colors input
  function renderSwatches() {
    const arr = colors.split(",").map((c) => c.trim()).filter(Boolean);
    if (!arr.length) return null;
    return (
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
        {arr.map((c, i) => {
          const cssColor = c.toLowerCase();
          // Try to use the color name as CSS color — if invalid it'll fallback to gray
          const safeStyle = {
            width: 28,
            height: 28,
            borderRadius: "50%",
            border: "1px solid #ddd",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            textTransform: "uppercase",
            boxShadow: "0 1px 1px rgba(0,0,0,0.06)",
            overflow: "hidden",
          };
          const swatchStyle = { ...safeStyle, backgroundColor: cssColor || "#f0f0f0", color: "#000" };

          // If color name is unusual (like "BABY PINK"), we also place initial letters
          const label = c.length > 10 ? c.slice(0, 2) : c;

          return (
            <div key={i} title={c} style={{ textAlign: "center" }}>
              <div style={swatchStyle}>
                {/* If browser can't render the color name, it will simply show label on default bg */}
                <span style={{ fontSize: 10 }}>{label}</span>
              </div>
              <div style={{ marginTop: 4, fontSize: 11 }}>{c}</div>
            </div>
          );
        })}
      </div>
    );
  }

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
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ display: "block", marginBottom: 4 }}>Slug</label>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="example-product-slug" />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ display: "block", marginBottom: 4 }}>SKU</label>
          <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="KPL001" />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ display: "block", marginBottom: 4 }}>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} />
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ minWidth: 120 }}>
            <label style={{ display: "block", marginBottom: 4 }}>Price (₹)</label>
            <input value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>

          <div style={{ minWidth: 120 }}>
            <label style={{ display: "block", marginBottom: 4 }}>MRP (₹)</label>
            <input value={mrp} onChange={(e) => setMrp(e.target.value)} />
          </div>

          <div style={{ minWidth: 160 }}>
            <label style={{ display: "block", marginBottom: 4 }}>Stock</label>
            <input value={stock} onChange={(e) => setStock(e.target.value)} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <div>
            <label style={{ display: "block", marginBottom: 4 }}>Brand</label>
            <input value={brand} onChange={(e) => setBrand(e.target.value)} />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 4 }}>Category</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ display: "block", marginBottom: 4 }}>Colors (comma separated)</label>
          <input value={colors} onChange={(e) => setColors(e.target.value)} placeholder="BABY PINK, BLACK, DARK" />
          {renderSwatches()}
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ display: "block", marginBottom: 4 }}>Sizes (comma separated)</label>
          <input value={sizes} onChange={(e) => setSizes(e.target.value)} placeholder="L, XL, XXL, 3XL" />
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ display: "block", marginBottom: 4 }}>Video URL</label>
          <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtube.com/..." />
        </div>

        <hr style={{ margin: "12px 0" }} />

        <div>
          <label style={{ display: "block", marginBottom: 6 }}>Images (select one or more)</label>
          <div style={{ margin: "8px 0" }}>
            <input type="file" multiple onChange={onFilesChange} />
            <button type="button" onClick={handleUploadFiles} disabled={loading} style={{ marginLeft: 8 }}>
              {loading ? "Uploading…" : "Upload"}
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            {uploadedImages.map((img, idx) => (
              <div key={idx} style={{ border: "1px solid #eee", padding: 6, borderRadius: 6 }}>
                <img src={img.url} alt={img.filename} style={{ width: 120, height: 120, objectFit: "cover" }} />
                <div style={{ marginTop: 6 }}>
                  <button type="button" onClick={() => removeUploaded(idx)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <button type="submit">Create Product</button>
          <button type="button" onClick={() => navigate(-1)} style={{ marginLeft: 10 }}>Cancel</button>
        </div>
      </form>

      {message && <div style={{ marginTop: 12, color: "crimson", whiteSpace: "pre-wrap" }}>{message}</div>}
    </div>
  );
}
