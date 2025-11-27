// src/admin/AdminProductEdit.js
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import "./AdminProductEdit.css";

/*
  AdminProductEdit replacement
  - Uploads new files BEFORE saving the product
  - Uses returned URLs from the backend upload endpoint
  - Preserves existing images that are 'kept'
  - Normalizes images to an array of URLs before saving
*/

const SVG_PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
    <rect width="100%" height="100%" fill="#f3f3f3"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#bbb" font-size="18">No image</text>
  </svg>`
);

function stringToArray(str) {
  if (!str) return [];
  if (Array.isArray(str)) return str;
  return String(str).split(",").map(s => s.trim()).filter(Boolean);
}
function arrayToString(arr) {
  if (!arr) return "";
  if (Array.isArray(arr)) return arr.join(", ");
  return String(arr);
}

// Helper: return upload endpoint for this product id
function uploadEndpoint(id) {
  // If you changed your backend route, update this function accordingly
  return `/api/products/${id}/upload`;
}

export default function AdminProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // basic product fields
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [price, setPrice] = useState("");
  const [mrp, setMrp] = useState("");
  const [stock, setStock] = useState("");
  const [sku, setSku] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [colorsText, setColorsText] = useState("");
  const [sizesText, setSizesText] = useState("");
  const [description, setDescription] = useState("");
  const [published, setPublished] = useState(false);

  // images
  // existingImages: array of { url: string, raw: originalDbValue, keep: boolean }
  const [existingImages, setExistingImages] = useState([]);
  // newFiles: File[]
  const [newFiles, setNewFiles] = useState([]);
  // previews for newFiles as data urls
  const [newPreviews, setNewPreviews] = useState([]);

  // Load product on mount
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await axiosInstance.get(`/api/products/${id}`);
        const data = res?.data;
        // server may return { product: {...} } or product directly
        const p = data?.product ?? data ?? {};
        if (!mounted) return;

        setTitle(p.title ?? "");
        setSlug(p.slug ?? "");
        setPrice(p.price ?? "");
        setMrp(p.mrp ?? "");
        setStock(p.stock ?? "");
        setSku(p.sku ?? "");
        setBrand(p.brand ?? "");
        setCategory(p.category ?? "");
        setVideoUrl(p.videoUrl ?? p.video ?? "");
        setColorsText(Array.isArray(p.colors) ? arrayToString(p.colors) : (p.colors ?? "").toString());
        setSizesText(Array.isArray(p.sizes) ? arrayToString(p.sizes) : (p.sizes ?? "").toString());
        setDescription(p.description ?? "");
        setPublished(Boolean(p.published || p.isPublished));

        // Normalize images from DB: accept strings or objects
        const rawImages = p.images ?? p.image ?? [];
        const arr = Array.isArray(rawImages) ? rawImages : (rawImages ? [rawImages] : []);
        const imgs = arr.map(i => {
          if (!i) return { url: SVG_PLACEHOLDER, raw: i, keep: true };
          if (typeof i === "string") return { url: i, raw: i, keep: true };
          if (typeof i === "object") {
            // object might be {url:..., alt:...} or {path:...}
            const url = i.url ?? i.path ?? (i.src ?? JSON.stringify(i));
            return { url, raw: i, keep: true };
          }
          return { url: String(i), raw: i, keep: true };
        });
        setExistingImages(imgs);
      } catch (err) {
        console.error("Fetch product failed:", err);
        alert("Failed to fetch product — check console.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [id]);

  // Create data-url previews for newFiles
  useEffect(() => {
    if (!newFiles || newFiles.length === 0) {
      setNewPreviews([]);
      return;
    }
    let cancelled = false;
    const readers = [];
    const results = new Array(newFiles.length);

    newFiles.forEach((f, i) => {
      const r = new FileReader();
      readers.push(r);
      r.onload = (e) => {
        results[i] = e.target.result;
        if (!cancelled && results.filter(Boolean).length === newFiles.length) {
          setNewPreviews(results.slice());
        }
      };
      r.onerror = () => {
        results[i] = SVG_PLACEHOLDER;
        if (!cancelled && results.filter(Boolean).length === newFiles.length) {
          setNewPreviews(results.slice());
        }
      };
      r.readAsDataURL(f);
    });

    return () => {
      cancelled = true;
      readers.forEach(rr => { try { rr.abort && rr.abort(); } catch (e) {} });
    };
  }, [newFiles]);

  // file change handler (select files)
  function handleFileChange(e) {
    const files = Array.from(e.target.files || []);
    setNewFiles(files);
  }

  // toggle keep flag for existing image
  function toggleKeepExisting(index) {
    setExistingImages(s => {
      const c = [...s];
      c[index] = { ...c[index], keep: !c[index].keep };
      return c;
    });
  }
  function removeExistingImage(index) {
    setExistingImages(s => {
      const c = [...s];
      c[index] = { ...c[index], keep: false };
      return c;
    });
  }
  function removeNewPreview(i) {
    const a = [...newFiles];
    const b = [...newPreviews];
    a.splice(i, 1);
    b.splice(i, 1);
    setNewFiles(a);
    setNewPreviews(b);
  }

  // safe img onError handler to show placeholder once
  const safeOnError = (e) => {
    try {
      const img = e.target;
      if (img.dataset.failed) return;
      img.dataset.failed = "1";
      img.src = SVG_PLACEHOLDER;
    } catch (err) {}
  };

  // Core: upload new files (if any) and return array of uploaded URLs
  async function uploadNewFilesAndReturnUrls() {
    if (!newFiles || newFiles.length === 0) return [];

    const fd = new FormData();
    newFiles.forEach(f => fd.append("images", f));

    // the backend endpoint you already used earlier in your existing file:
    const endpoint = uploadEndpoint(id);

    // Use PUT as in your existing code; change to POST if your API expects POST
    const res = await axiosInstance.put(endpoint, fd, {
      headers: { "Content-Type": "multipart/form-data" },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    // expect response like { images: [...] } or { files: [ { url } ] } or array
    const data = res?.data ?? {};
    // several backends return array directly
    if (Array.isArray(data)) {
      // array of strings or objects
      return data.map(i => (typeof i === "string" ? i : (i.url || i.path || i.filename || ""))).filter(Boolean);
    }
    if (Array.isArray(data.images)) {
      return data.images.map(i => (typeof i === "string" ? i : (i.url || i.path || i.filename))).filter(Boolean);
    }
    if (Array.isArray(data.files)) {
      return data.files.map(f => (f.url || f.filename || f.path)).filter(Boolean);
    }
    // fallback: try data.url or data.image
    if (data.url) return [data.url];
    return [];
  }

  // Build final images list: kept existing images (strings) + uploaded urls
  function keptExistingAsUrls() {
    return existingImages
      .filter(i => i.keep)
      .map(i => {
        const raw = i.raw;
        if (!raw) return i.url || SVG_PLACEHOLDER;
        if (typeof raw === "string") return raw;
        if (typeof raw === "object") return raw.url ?? raw.path ?? i.url;
        return String(raw);
      })
      .filter(Boolean);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);

    try {
      // First, upload new images (if any). If upload endpoint fails, do not overwrite DB images.
      let uploaded = [];
      if (newFiles && newFiles.length > 0) {
        uploaded = await uploadNewFilesAndReturnUrls();
        if (!uploaded || uploaded.length === 0) {
          // If the backend didn't return urls, abort and show error
          throw new Error("Upload failed or returned no URLs. Check the upload endpoint response.");
        }
      }

      const finalImages = [...keptExistingAsUrls(), ...uploaded];

      // Build payload (normalize arrays)
      const payload = {
        title, slug, price, mrp, stock, sku, brand, category, videoUrl,
        colors: stringToArray(colorsText),
        sizes: stringToArray(sizesText),
        description, published,
        images: finalImages
      };

      // Save product (PUT)
      await axiosInstance.put(`/api/products/${id}`, payload);

      // on success navigate back to product list
      alert("Product updated");
      navigate("/admin/products");
    } catch (err) {
      console.error("Save failed:", err, err?.response?.data ?? "");
      const msg = err?.response?.data?.error ?? err.message ?? "Save/upload failed";
      alert("Error: " + msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ padding: 20 }}>Loading…</div>;

  return (
    <div className="admin-edit-wrap">
      <h1>Edit product — {title}</h1>
      <button onClick={() => navigate("/admin/products")}>Back to products</button>

      <form onSubmit={handleSave} className="admin-edit-form" style={{ display: "flex", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <label>Title<br /><input value={title} onChange={e => setTitle(e.target.value)} /></label>
          <br />
          <label>Slug<br /><input value={slug} onChange={e => setSlug(e.target.value)} /></label>
          <br />
          <label>Price<br /><input value={price} onChange={e => setPrice(e.target.value)} /></label>
          <br />
          <label>MRP<br /><input value={mrp} onChange={e => setMrp(e.target.value)} /></label>
          <br />
          <label>Stock<br /><input value={stock} onChange={e => setStock(e.target.value)} /></label>
          <br />
          <label>SKU<br /><input value={sku} onChange={e => setSku(e.target.value)} /></label>
          <br />
          <label>Brand<br /><input value={brand} onChange={e => setBrand(e.target.value)} /></label>
          <br />
          <label>Category<br /><input value={category} onChange={e => setCategory(e.target.value)} /></label>
          <br />
          <label>Video URL<br /><input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} /></label>
        </div>

        <div style={{ width: 420 }}>
          <h4>Existing Images</h4>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {existingImages.length === 0 && <div>No existing images</div>}
            {existingImages.map((img, idx) => (
              <div key={idx} style={{ width: 120, textAlign: "center", opacity: img.keep ? 1 : 0.5 }}>
                <img src={img.url || SVG_PLACEHOLDER} alt="" style={{ maxWidth: "100%", height: 100, objectFit: "contain", border: "1px solid #eee" }} onError={safeOnError} />
                <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 6 }}>
                  <label style={{ fontSize: 12 }}>
                    <input type="checkbox" checked={img.keep} onChange={() => toggleKeepExisting(idx)} /> Keep
                  </label>
                  <button type="button" onClick={() => removeExistingImage(idx)}>Remove</button>
                </div>
              </div>
            ))}
          </div>

          <h4 style={{ marginTop: 16 }}>Add Images</h4>
          <input type="file" multiple accept="image/*" onChange={handleFileChange} />
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
            {newPreviews.map((src, i) => (
              <div key={i} style={{ width: 120, textAlign: "center" }}>
                <img src={src} alt="" style={{ maxWidth: "100%", height: 100, objectFit: "contain", border: "1px solid #eee" }} onError={safeOnError} />
                <div style={{ marginTop: 6 }}>
                  <button type="button" onClick={() => removeNewPreview(i)}>Remove</button>
                </div>
              </div>
            ))}
          </div>

          <label style={{ display: "block", marginTop: 12 }}>Colors (comma-separated)<br />
            <input value={colorsText} onChange={e => setColorsText(e.target.value)} placeholder="red, blue" />
          </label>

          <div style={{ marginTop: 8 }}>
            {stringToArray(colorsText).map((c, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8, marginRight: 8 }}>
                <div style={{ width: 16, height: 16, backgroundColor: c, border: "1px solid #ccc" }} /> <small>{c}</small>
              </span>
            ))}
          </div>

          <label style={{ display: "block", marginTop: 12 }}>Sizes (comma-separated)<br />
            <input value={sizesText} onChange={e => setSizesText(e.target.value)} placeholder="S, M, L" />
          </label>

          <label style={{ display: "block", marginTop: 12 }}>Description<br />
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={6} style={{ width: "100%" }} />
          </label>

          <label style={{ display: "block", marginTop: 8 }}>
            <input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} /> Published
          </label>
        </div>

        <div style={{ position: "absolute", left: 20, bottom: 20 }}>
          <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          <button type="button" onClick={() => navigate("/admin/products")} style={{ marginLeft: 8 }}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
