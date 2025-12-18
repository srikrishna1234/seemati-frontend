// src/admin/AdminProductEdit.js
import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";

const AVAILABLE_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];

/* ================= COLOR HELPERS ================= */

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
};

function hexToRgb(hex) {
  if (!hex) return null;
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  if (full.length !== 6) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function nearestColorName(hex) {
  const target = hexToRgb(hex);
  if (!target) return hex;
  let best = null;
  let bestDist = Infinity;
  for (const [name, val] of Object.entries(NAMED_COLORS)) {
    const rgb = hexToRgb(val);
    if (!rgb) continue;
    const d =
      (rgb.r - target.r) ** 2 +
      (rgb.g - target.g) ** 2 +
      (rgb.b - target.b) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = name;
    }
  }
  return best || hex;
}

/* ✅ BACKEND SAFE FORMAT */
function normalizeColorsForBackend(swatches) {
  return swatches
    .filter(Boolean)
    .map(c => ({
      name: nearestColorName(c),
      hex: c
    }));
}

function getYouTubeEmbedUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com"))
      return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
    if (u.hostname.includes("youtu.be"))
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
  } catch {}
  return null;
}

/* ================= COMPONENT ================= */

export default function AdminProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const colorPickerRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
  title: "",
  description: "",
  price: "",
  mrp: "",
  stock: "",
  category: "",
  brand: "",
  sku: "",
  slug: "",
  videoUrl: "",
  sizes: [],
  images: [],
  published: false
});
const [customSizesInput, setCustomSizesInput] = useState("");


  /* 🔴 COLOR STATE */
  const [colorsInput, setColorsInput] = useState("");
  const [swatches, setSwatches] = useState([]);
  const [colorPickerIndex, setColorPickerIndex] = useState(null);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);

  /* ---------- LOAD PRODUCT ---------- */
  useEffect(() => {
async function load() {
  const res = await axiosInstance.get(`/products/id/${id}`);
  const p = res.data.product || res.data;
  if (!p) return alert("Product not found");

  const incomingSizes = Array.isArray(p.sizes)
    ? p.sizes.map(s => String(s).trim())
    : [];

  const checkboxSizes = incomingSizes.filter(s =>
    AVAILABLE_SIZES.includes(s)
  );

  const customSizes = incomingSizes.filter(s =>
    !AVAILABLE_SIZES.includes(s)
  );

  setForm({
    title: p.title || "",
    description: p.description || "",
    price: p.price || "",
    mrp: p.mrp || "",
    stock: p.stock || "",
    category: p.category || "",
    brand: p.brand || "",
    sku: p.sku || "",
    slug: p.slug || "",
    videoUrl: p.videoUrl || "",
    sizes: checkboxSizes,
    images: p.images || [],
    published: Boolean(p.published)
  });

  setCustomSizesInput(customSizes.join(", "));

  setSwatches((p.colors || []).map(c => c.hex || c));
  setColorsInput(
    (p.colors || [])
      .map(c => (c.name || "").toUpperCase())
      .join(", ")
  );

  setUploadedImages(p.images || []);
}


  load().finally(() => setLoading(false));
}, [id]);


  /* ---------- HANDLERS ---------- */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const toggleSize = (size) => {
    setForm(f => ({
      ...f,
      sizes: f.sizes.includes(size)
        ? f.sizes.filter(s => s !== size)
        : [...f.sizes, size]
    }));
  };

  /* ---------- COLOR LOGIC ---------- */

  const onColorsInputChange = (e) => {
    const value = e.target.value;
    setColorsInput(value);

    const names = value
      .split(",")
      .map(c => c.trim().toLowerCase())
      .filter(Boolean);

    const hexes = names
      .map(n => NAMED_COLORS[n])
      .filter(Boolean);

    setSwatches(hexes);
  };

  const syncInputFromSwatches = (next) => {
    setColorsInput(
      next.map(h => nearestColorName(h).toUpperCase()).join(", ")
    );
  };

  const openColorPickerAtIndex = (idx) => {
    setColorPickerIndex(idx);
    colorPickerRef.current.value = swatches[idx] || "#FFFFFF";
    colorPickerRef.current.click();
  };

  const onColorPickerChange = (e) => {
    const val = e.target.value.toUpperCase();
    setSwatches(prev => {
      const copy = [...prev];
      copy[colorPickerIndex] = val;
      syncInputFromSwatches(copy);
      return copy;
    });
    setColorPickerIndex(null);
  };

  const addSwatch = () => {
    setSwatches(prev => {
      const next = [...prev, "#FFFFFF"];
      syncInputFromSwatches(next);
      return next;
    });
  };

  const removeSwatch = (i) => {
    setSwatches(prev => {
      const next = prev.filter((_, idx) => idx !== i);
      syncInputFromSwatches(next);
      return next;
    });
  };

  /* ---------- IMAGES ---------- */

  const onFilesChange = (e) => {
    const files = Array.from(e.target.files || []);
    const mapped = files.map(f => ({
      file: f,
      preview: URL.createObjectURL(f)
    }));
    setSelectedFiles(prev => [...prev, ...mapped]);
    fileInputRef.current.value = "";
  };

  const removeSelectedFile = (idx) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const removeUploadedImage = (idx) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== idx));
  };

  async function uploadSelectedImages() {
  if (!selectedFiles.length) return [];

  const fd = new FormData();
  selectedFiles.forEach(s => fd.append("files", s.file));

  const res = await axiosInstance.post("/uploadRoutes/upload", fd);

  const urls = (res.data.uploaded || [])
    .map(u => u.url)
    .filter(Boolean);

  setUploadedImages(prev => [...prev, ...urls]);
  setSelectedFiles([]);

  return urls;
}


  /* ---------- SAVE ---------- */
  const handleSubmit = async (e) => {
  e.preventDefault();
  setSaving(true);

  try {
    let newUrls = [];
    if (selectedFiles.length) {
      newUrls = await uploadSelectedImages();
    }

    // ✅ BUILD PAYLOAD FIRST
    // ✅ MERGE CHECKBOX + CUSTOM SIZES SAFELY
const customSizes = customSizesInput
  .split(",")
  .map(s => String(s).trim())
  .filter(Boolean);

const normalizedSizes = Array.from(
  new Set([
    ...(form.sizes || []),
    ...customSizes
  ])
);


    const normalizedColors = Array.from(
      new Map(
        normalizeColorsForBackend(swatches)
          .filter(c => c?.name && c?.hex)
          .map(c => [
            c.name.toLowerCase(),
            {
              name: c.name.toLowerCase(),
              hex: c.hex.toUpperCase()
            }
          ])
      ).values()
    );

   const payload = {
  ...form,
  price: Number(form.price),
  mrp: Number(form.mrp),
  stock: Number(form.stock),
  sizes: normalizedSizes,
  colors: normalizedColors,
  images: [...uploadedImages, ...newUrls],
  videoUrl: (form.videoUrl || "").trim(),
  published: Boolean(form.published)
};

console.log("🚨 FINAL PAYLOAD BEING SENT", {
  sizes: payload.sizes,
  colors: payload.colors,
  videoUrl: payload.videoUrl
});


    // ✅ SEND JSON PAYLOAD
   await axiosInstance.put(`/admin/products/${id}`, payload);

/*
// 🔁 REFRESH FROM BACKEND (ADMIN API)
// 🔁 REFRESH FROM BACKEND (ADMIN API)
const res = await axiosInstance.get(`/products/id/${id}`);
const p = res.data.product || res.data;

// ---- SPLIT SIZES AGAIN AFTER SAVE ----
const incomingSizes = Array.isArray(p.sizes)
  ? p.sizes.map(s => String(s).trim())
  : [];

const checkboxSizes = incomingSizes.filter(s =>
  AVAILABLE_SIZES.includes(s)
);

const customSizes = incomingSizes.filter(s =>
  !AVAILABLE_SIZES.includes(s)
);

setForm({
  title: p.title || "",
  description: p.description || "",
  price: p.price || "",
  mrp: p.mrp || "",
  stock: p.stock || "",
  category: p.category || "",
  brand: p.brand || "",
  sku: p.sku || "",
  slug: p.slug || "",
  videoUrl: p.videoUrl || "",
  sizes: checkboxSizes,
  images: p.images || [],
  published: Boolean(p.published)
});

setCustomSizesInput(customSizes.join(", "));
setSwatches((p.colors || []).map(c => c.hex || c));
setColorsInput(
  (p.colors || [])
    .map(c => (c.name || "").toUpperCase())
    .join(", ")
); */

alert("Product updated successfully");

    navigate("/admin/products");
  } catch (err) {
    console.error(err);
    alert("Save failed");
  } finally {
    setSaving(false);
  }
};


  if (loading) return <p>Loading...</p>;
  const embedUrl = getYouTubeEmbedUrl(form.videoUrl);

  /* ---------- UI ---------- */
  const row = { marginBottom: 12 };
  const label = { display: "block", fontWeight: 500, marginBottom: 4 };
  const input = { width: "100%", padding: 6 };

  return (
    <div style={{ padding: 20, maxWidth: 1000 }}>
      <button onClick={() => navigate("/admin/products")}>Back to products</button>
      <h2>Edit Product</h2>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "flex", gap: 30 }}>
          {/* LEFT */}
          <div style={{ flex: 1 }}>
            <div style={row}><label style={label}>Title</label><input style={input} name="title" value={form.title} onChange={handleChange} /></div>
            <div style={row}><label style={label}>Slug</label><input style={input} name="slug" value={form.slug} onChange={handleChange} /></div>
            <div style={row}><label style={label}>Price</label><input style={input} type="number" name="price" value={form.price} onChange={handleChange} /></div>
            <div style={row}><label style={label}>MRP</label><input style={input} type="number" name="mrp" value={form.mrp} onChange={handleChange} /></div>
            <div style={row}><label style={label}>Stock</label><input style={input} type="number" name="stock" value={form.stock} onChange={handleChange} /></div>
            <div style={row}><label style={label}>Category</label><input style={input} name="category" value={form.category} onChange={handleChange} /></div>
            <div style={row}><label style={label}>SKU</label><input style={input} name="sku" value={form.sku} onChange={handleChange} /></div>
            <div style={row}><label style={label}>Brand</label><input style={input} name="brand" value={form.brand} onChange={handleChange} /></div>
            <div style={row}><label style={label}>Description</label><textarea style={input} rows={5} name="description" value={form.description} onChange={handleChange} /></div>

            <div style={row}>
              <label style={label}>Sizes</label>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {AVAILABLE_SIZES.map(s => (
                  <label key={s}>
                    <input type="checkbox" checked={form.sizes.includes(s)} onChange={() => toggleSize(s)} /> {s}
                  </label>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 8 }}>
  <label style={{ fontSize: 13, color: "#555" }}>
    Custom sizes (optional)
  </label>
  <input
    style={{ ...input, marginTop: 4 }}
    placeholder="Example: 95, 100, 105"
    value={customSizesInput}
    onChange={(e) => setCustomSizesInput(e.target.value)}
  />
</div>

            {/* COLORS */}
            <div style={row}>
              <label style={label}>Colors</label>

              <input
                style={{ ...input, marginBottom: 10 }}
                placeholder="PINK, BLACK, GREEN"
                value={colorsInput}
                onChange={onColorsInputChange}
              />

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {swatches.map((c, i) => (
                  <div key={i} style={{ textAlign: "center" }}>
                    <div
                      onClick={() => openColorPickerAtIndex(i)}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 6,
                        border: "1px solid #ccc",
                        background: c,
                        cursor: "pointer"
                      }}
                    />
                    <div style={{ fontSize: 12 }}>{nearestColorName(c)}</div>
                    <button type="button" onClick={() => removeSwatch(i)}>Remove</button>
                  </div>
                ))}
                <button type="button" onClick={addSwatch}>+ Add color</button>
                <input ref={colorPickerRef} type="color" style={{ display: "none" }} onChange={onColorPickerChange} />
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div style={{ width: 360 }}>
            <h3>Images</h3>
            <input ref={fileInputRef} type="file" multiple onChange={onFilesChange} />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
              {uploadedImages.map((url, i) => (
                <div key={i}>
                  <img src={url} alt="" width={90} />
                  <button type="button" onClick={() => removeUploadedImage(i)}>Remove</button>
                </div>
              ))}
              {selectedFiles.map((s, i) => (
                <div key={i}>
                  <img src={s.preview} alt="" width={90} />
                  <button type="button" onClick={() => removeSelectedFile(i)}>Remove</button>
                </div>
              ))}
            </div>

            <h3 style={{ marginTop: 16 }}>Video URL</h3>
            <input style={input} name="videoUrl" value={form.videoUrl} onChange={handleChange} />
            {embedUrl && (
              <div style={{ marginTop: 10 }}>
                <iframe title="video" src={embedUrl} width="100%" height="200" />
              </div>
            )}
          </div>
        </div>
         <div style={{ marginTop: 16 }}>
  <label style={{ fontWeight: 500 }}>
    <input
      type="checkbox"
      name="published"
      checked={form.published}
      onChange={(e) =>
        handleChange({
          target: {
            name: "published",
            value: e.target.checked
          }
        })
      }
      style={{ marginRight: 6 }}
    />
    Published (visible on live site)
  </label>
</div>


        <button type="submit" disabled={saving} style={{ marginTop: 20 }}>
          {saving ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}
