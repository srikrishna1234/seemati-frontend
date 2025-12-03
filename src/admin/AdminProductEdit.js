// src/admin/AdminProductEdit.js
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance"; // adjust if your path is different

/**
 * AdminProductEdit
 * - Edit product form + image management (existing)
 * - Adds color swatches preview below the Colors input.
 * - Adds a Video preview box that embeds YouTube links automatically.
 */

export default function AdminProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Product fields
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState({
    title: "",
    slug: "",
    price: "",
    mrp: "",
    stock: "",
    sku: "",
    brand: "",
    category: "",
    videoUrl: "",
    colors: "",
    sizes: "",
    description: "",
    isPublished: false,
  });

  // existingImages: array of URL strings currently saved in DB
  const [existingImages, setExistingImages] = useState([]); // e.g. ['https://...png', ...]
  // keep map for existing images (true = keep, false = remove)
  const [keepMap, setKeepMap] = useState({});

  // previews for newly selected files (File objects + preview URL)
  const [selectedFiles, setSelectedFiles] = useState([]); // [{ file, previewUrl }]

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const resp = await axiosInstance.get(`/api/products/${id}`);
        if (resp.data && resp.data.product) {
          const p = resp.data.product;
          setProduct({
            title: p.title || "",
            slug: p.slug || "",
            price: p.price || "",
            mrp: p.mrp || "",
            stock: p.stock || "",
            sku: p.sku || "",
            brand: p.brand || "",
            category: p.category || "",
            videoUrl: p.videoUrl || "",
            colors: Array.isArray(p.colors) ? p.colors.join(", ") : p.colors || "",
            sizes: Array.isArray(p.sizes) ? p.sizes.join(", ") : p.sizes || "",
            description: p.description || "",
            isPublished: !!p.isPublished,
          });

          // Normalize images: some responses use arrays of strings, some use objects
          const imgs = Array.isArray(p.images)
            ? p.images.map((it) => (typeof it === "string" ? it : it.url || it))
            : [];
          setExistingImages(imgs);

          // mark all existing images to keep by default
          const map = {};
          imgs.forEach((url) => (map[url] = true));
          setKeepMap(map);
        } else {
          alert("Failed to load product.");
        }
      } catch (err) {
        console.error("Failed to fetch product", err);
        alert("Error loading product. See console.");
      } finally {
        setLoading(false);
      }
    }
    load();
    // cleanup previews on unmount
    return () => {
      selectedFiles.forEach((s) => s.previewUrl && URL.revokeObjectURL(s.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Handle input changes
  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    if (name === "isPublished") {
      setProduct((prev) => ({ ...prev, isPublished: !!checked }));
    } else {
      setProduct((prev) => ({ ...prev, [name]: value }));
    }
  }

  // File selection -> create previews
  function onFilesSelected(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newSelected = files.map((f) => ({
      file: f,
      previewUrl: URL.createObjectURL(f),
    }));

    // append to existing selectedFiles
    setSelectedFiles((prev) => {
      return [...prev, ...newSelected];
    });

    // reset input so the same file can be re-selected if user wants
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Remove preview (before upload)
  function removeSelectedPreview(index) {
    setSelectedFiles((prev) => {
      const copy = [...prev];
      const removed = copy.splice(index, 1)[0];
      if (removed && removed.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return copy;
    });
  }

  // Toggle keep/remove for existing image URL
  function toggleKeep(url) {
    setKeepMap((prev) => ({ ...prev, [url]: !prev[url] }));
  }

  // Helper to upload files (if any) to backend; returns array of uploaded URLs
  async function uploadFilesIfAny() {
    if (!selectedFiles.length) return [];
    const formData = new FormData();
    // append each file with same field name; backend accepts any field and handles multiple files
    selectedFiles.forEach((s) => formData.append("files", s.file)); // name doesn't matter due to multer.any()

    try {
      const resp = await axiosInstance.put(`/api/products/${id}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // backend returns: { uploaded: [ {key,url}, ... ], key, url } OR legacy { key, url }
      const data = resp && resp.data ? resp.data : {};
      let uploadedArray = [];
      if (Array.isArray(data.uploaded) && data.uploaded.length) {
        uploadedArray = data.uploaded;
      } else if (data.key && data.url) {
        uploadedArray = [{ key: data.key, url: data.url }];
      } else {
        // defensive: try resp.data directly if array
        if (Array.isArray(data)) {
          uploadedArray = data;
        }
      }

      // extract urls
      const urls = uploadedArray
        .map((u) => (u && u.url ? u.url : typeof u === "string" ? u : null))
        .filter(Boolean);

      return urls;
    } catch (err) {
      console.error("Upload failed", err);
      throw new Error("Upload request failed");
    }
  }

  // Build final images array (keep existing ones that are checked + newly uploaded)
  function buildFinalImageList(uploadedUrls) {
    const kept = existingImages.filter((url) => keepMap[url]);
    // avoid duplicates: include kept first then uploaded that are not already present
    const final = [...kept];
    uploadedUrls.forEach((u) => {
      if (!final.includes(u)) final.push(u);
    });
    return final;
  }

  // Save handler: upload selected files (if any), then PUT product with images array
  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);

    try {
      // 1) upload files if selected
      let uploadedUrls = [];
      if (selectedFiles.length) {
        uploadedUrls = await uploadFilesIfAny();
        if (!uploadedUrls.length) {
          alert("Upload failed or returned no URLs. Check the upload endpoint response.");
          setSaving(false);
          return;
        }
      }

      // 2) build images array: kept existing + uploaded
      const images = buildFinalImageList(uploadedUrls);

      // 3) prepare body: convert colors/sizes to arrays, and include images as array of strings
      const body = {
        title: product.title,
        slug: product.slug,
        price: Number(product.price) || 0,
        mrp: Number(product.mrp) || 0,
        stock: Number(product.stock) || 0,
        sku: product.sku,
        brand: product.brand,
        category: product.category,
        videoUrl: product.videoUrl,
        description: product.description,
        isPublished: !!product.isPublished,
        colors: product.colors ? product.colors.split(",").map((s) => s.trim()).filter(Boolean) : [],
        sizes: product.sizes ? product.sizes.split(",").map((s) => s.trim()).filter(Boolean) : [],
        images, // array of string URLs
      };

      // 4) PUT updated product
      const resp = await axiosInstance.put(`/api/products/${id}`, body);
      if (resp && resp.data && resp.data.success) {
        // cleanup previews memory
        selectedFiles.forEach((s) => s.previewUrl && URL.revokeObjectURL(s.previewUrl));
        setSelectedFiles([]);
        // Update UI with returned product (if provided)
        const updatedProduct = resp.data.product || resp.data;
        if (updatedProduct) {
          const imgs = Array.isArray(updatedProduct.images)
            ? updatedProduct.images.map((it) => (typeof it === "string" ? it : it.url || it))
            : [];
          setExistingImages(imgs);
          const map = {};
          imgs.forEach((url) => (map[url] = true));
          setKeepMap(map);
        }

        alert("Product updated");
      } else {
        console.error("Save failed", resp);
        alert("Save failed. Check server response.");
      }
    } catch (err) {
      console.error("Save error", err);
      alert(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div>Loading...</div>;

  // ---------------------
  // Color swatch helpers
  // ---------------------
  // map likely Seemati color names to hex values (extend as needed)
  const NAMED_COLOR_MAP = {
    "BABY PINK": "#ffd1dc",
    "BABY_PINK": "#ffd1dc",
    PINK: "#ffc0cb",
    BLACK: "#000000",
    WHITE: "#ffffff",
    "NAVY BLUE": "#0b2545",
    NAVY: "#0b2545",
    MUSTARD: "#e0a800",
    MAROON: "#800000",
    GREY: "#808080",
    GRAY: "#808080",
    SKY: "#87ceeb",
    "SKY BLUE": "#87ceeb",
    PEACH: "#ffdab9",
    RED: "#e53935",
    GREEN: "#2e7d32",
    "BOTTLE GREEN": "#1b5e20",
    "RANI PINK": "#ff5ca1",
    GOLD: "#d4af37",
    WINE: "#7b113a",
    ONION: "#c08a83",
    "RAMA BLUE": "#1f6ea5",
    "RAMA GREEN": "#2a7f62",
  };

  function normalizeColorKey(name) {
    return (name || "").toString().trim().toUpperCase().replace(/\s+/g, "_");
  }

  // returns a CSS-valid color string (hex or name); null if not resolvable
  function colorStringFor(name) {
    if (!name) return null;
    const key = normalizeColorKey(name);
    if (NAMED_COLOR_MAP[key]) return NAMED_COLOR_MAP[key];

    // try to use the raw name as a color (e.g., 'red', 'lightblue')
    // We'll defensively test in DOM using a temporary element to ensure the browser recognizes it.
    try {
      const test = document.createElement("div");
      test.style.backgroundColor = name;
      document.body.appendChild(test);
      const cs = getComputedStyle(test).backgroundColor;
      document.body.removeChild(test);
      // if the computed style is not 'rgba(0, 0, 0, 0)' or 'transparent', we assume it's valid.
      if (cs && cs !== "rgba(0, 0, 0, 0)" && cs !== "transparent") {
        return name;
      }
    } catch (err) {
      // ignore
    }

    // final fallback: generate a deterministic pastel color from name
    const hash = Array.from(name).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const h = hash % 360;
    return `hsl(${h} 60% 80%)`;
  }

  function renderSwatchesFromColors(colorsCsv) {
    const colors = (colorsCsv || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!colors.length) return <div style={{ color: "#666" }}>No colors</div>;

    return (
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
        {colors.map((c, i) => {
          const col = colorStringFor(c) || "#ddd";
          const textColor = getContrastYIQ(col);
          return (
            <div
              key={c + i}
              title={c}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: 80,
                fontSize: 12,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 6,
                  boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
                  background: col,
                  border: "1px solid rgba(0,0,0,0.06)",
                }}
              />
              <div style={{ marginTop: 6, color: textColor }}>{c}</div>
            </div>
          );
        })}
      </div>
    );
  }

  // pick readable text color for a background (works for hex / rgb / hsl strings)
  function getContrastYIQ(bg) {
    // attempt to parse hex or rgb; fallback to dark text
    try {
      const ctx = document.createElement("canvas").getContext("2d");
      ctx.fillStyle = bg;
      const computed = ctx.fillStyle; // normalized color
      // create a temp div to get computed rgb
      const d = document.createElement("div");
      d.style.backgroundColor = computed;
      document.body.appendChild(d);
      const rgb = getComputedStyle(d).backgroundColor;
      document.body.removeChild(d);
      // rgb is like 'rgb(r, g, b)' or 'rgba(...)'
      const nums = rgb.match(/\d+/g);
      if (!nums || nums.length < 3) return "#111";
      const r = parseInt(nums[0], 10);
      const g = parseInt(nums[1], 10);
      const b = parseInt(nums[2], 10);
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq >= 128 ? "#111" : "#fff";
    } catch (err) {
      return "#111";
    }
  }

  // ---------------------
  // Video embed helper
  // ---------------------
  function getYouTubeEmbedUrl(url) {
    if (!url) return null;
    try {
      const u = url.trim();
      // common YouTube patterns:
      // https://www.youtube.com/watch?v=VIDEO_ID
      // https://youtu.be/VIDEO_ID
      // https://www.youtube.com/embed/VIDEO_ID (already embed)
      const ytMatch =
        u.match(
          /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_\-]{6,})/
        ) || [];
      const id = ytMatch[1];
      if (id) {
        return `https://www.youtube.com/embed/${id}`;
      }
      // If already an embed url, accept it
      if (u.includes("youtube.com/embed/")) return u;
      return null;
    } catch (err) {
      return null;
    }
  }

  const embedUrl = getYouTubeEmbedUrl(product.videoUrl);

  // ---------------------
  // Render
  // ---------------------
  return (
    <div style={{ display: "flex", gap: 40, alignItems: "flex-start" }}>
      <form onSubmit={handleSave} style={{ width: "50%", minWidth: 360 }}>
        <div style={{ marginBottom: 10 }}>
          <button type="button" onClick={() => navigate("/admin/products")}>
            Back to products
          </button>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>Title</label>
          <br />
          <input name="title" value={product.title} onChange={handleChange} style={{ width: "100%" }} />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>Slug</label>
          <br />
          <input name="slug" value={product.slug} onChange={handleChange} style={{ width: "100%" }} />
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <label>Price</label>
            <br />
            <input name="price" value={product.price} onChange={handleChange} style={{ width: "100%" }} />
          </div>
          <div style={{ flex: 1 }}>
            <label>MRP</label>
            <br />
            <input name="mrp" value={product.mrp} onChange={handleChange} style={{ width: "100%" }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <label>Stock</label>
            <br />
            <input name="stock" value={product.stock} onChange={handleChange} style={{ width: "100%" }} />
          </div>
          <div style={{ flex: 1 }}>
            <label>SKU</label>
            <br />
            <input name="sku" value={product.sku} onChange={handleChange} style={{ width: "100%" }} />
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>Brand</label>
          <br />
          <input name="brand" value={product.brand} onChange={handleChange} style={{ width: "100%" }} />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>Category</label>
          <br />
          <input name="category" value={product.category} onChange={handleChange} style={{ width: "100%" }} />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>Video URL (YouTube)</label>
          <br />
          <input name="videoUrl" value={product.videoUrl} onChange={handleChange} style={{ width: "100%" }} />
          <div style={{ marginTop: 8, color: "#666", fontSize: 13 }}>
            Paste YouTube link (example: https://youtu.be/VIDEOID or https://www.youtube.com/watch?v=VIDEOID)
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>Colors (comma-separated)</label>
          <br />
          <input name="colors" value={product.colors} onChange={handleChange} style={{ width: "100%" }} />
          {/* color swatches */}
          <div>{renderSwatchesFromColors(product.colors)}</div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>Sizes (comma-separated)</label>
          <br />
          <input name="sizes" value={product.sizes} onChange={handleChange} style={{ width: "100%" }} />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>Description</label>
          <br />
          <textarea
            name="description"
            value={product.description}
            onChange={handleChange}
            rows={6}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>
            <input name="isPublished" type="checkbox" checked={product.isPublished} onChange={handleChange} /> Published
          </label>
        </div>

        <div style={{ marginTop: 8 }}>
          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>{" "}
          <button type="button" onClick={() => navigate("/admin/products")}>
            Cancel
          </button>
        </div>
      </form>

      {/* Right column: video preview + existing images + upload */}
      <div style={{ width: "45%", minWidth: 320 }}>
        {/* Video preview */}
        <div style={{ marginBottom: 18 }}>
          <h3 style={{ margin: "0 0 8px 0" }}>Video preview</h3>
          {embedUrl ? (
            <div style={{ border: "1px solid #eee", borderRadius: 6, overflow: "hidden", width: "100%" }}>
              <iframe
                title="video-preview"
                src={embedUrl}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ width: "100%", height: 200 }}
              />
            </div>
          ) : product.videoUrl ? (
            <div style={{ color: "#666" }}>
              Unable to preview this URL. It is not recognized as a YouTube link. You may still save it.
            </div>
          ) : (
            <div style={{ color: "#666" }}>No video URL set.</div>
          )}
        </div>

        <h3 style={{ margin: "0 0 8px 0" }}>Existing Images</h3>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          {existingImages.map((url, idx) => (
            <div key={url} style={{ textAlign: "center", width: 120 }}>
              <img src={url} alt={`img-${idx}`} style={{ width: 100, height: 100, objectFit: "cover", borderRadius: 6 }} />
              <div>
                <label>
                  <input type="checkbox" checked={!!keepMap[url]} onChange={() => toggleKeep(url)} /> Keep
                </label>
              </div>
              <div>
                <button type="button" onClick={() => setKeepMap((prev) => ({ ...prev, [url]: false }))}>
                  Remove
                </button>
              </div>
            </div>
          ))}
          {existingImages.length === 0 && <div>No existing images</div>}
        </div>

        <h3 style={{ margin: "0 0 8px 0" }}>Add Images</h3>
        <input ref={fileInputRef} type="file" multiple onChange={onFilesSelected} />
        <div style={{ marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap" }}>
          {selectedFiles.map((s, i) => (
            <div key={s.previewUrl + i} style={{ textAlign: "center", width: 120 }}>
              <img src={s.previewUrl} alt={`preview-${i}`} style={{ width: 100, height: 100, objectFit: "cover", borderRadius: 6 }} />
              <div>
                <button type="button" onClick={() => removeSelectedPreview(i)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
          {selectedFiles.length === 0 && <div>No files chosen</div>}
        </div>
      </div>
    </div>
  );
}
