// src/admin/AdminProductEdit.js
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import "./AdminProductEdit.css";

function stringToArray(str) {
  if (!str) return [];
  if (Array.isArray(str)) return str;
  return String(str).split(",").map((s) => s.trim()).filter(Boolean);
}
function arrayToString(arr) {
  if (!arr) return "";
  if (Array.isArray(arr)) return arr.join(", ");
  return String(arr);
}

// small inline SVG placeholder (data URI) — guaranteed to be an image
const SVG_PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <rect width="100%" height="100%" fill="#f3f3f3"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#bbb" font-size="16">No image</text>
  </svg>`
);

export default function AdminProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

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

  const [existingImages, setExistingImages] = useState([]); // {url, raw, keep}
  const [newFiles, setNewFiles] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await axiosInstance.get(`/api/products/${id}`);
        const p = res.data || {};
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
        setPublished(Boolean(p.published));
        const imgs = (p.images || []).map((img) => {
          const raw = img;
          const url = typeof img === "string" ? img : (img.url || img.path || String(img));
          return { url, raw, keep: true };
        });
        setExistingImages(imgs);
      } catch (err) {
        console.error("Fetch product failed:", err);
        alert("Failed to fetch product — check console.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // previews for new files
  useEffect(() => {
    if (!newFiles || newFiles.length === 0) return setNewPreviews([]);
    const arr = [];
    newFiles.forEach((f, i) => {
      const r = new FileReader();
      r.onload = (e) => {
        arr[i] = e.target.result;
        if (arr.filter(Boolean).length === newFiles.length) setNewPreviews(arr);
      };
      r.readAsDataURL(f);
    });
  }, [newFiles]);

  function handleFileChange(e) {
    setNewFiles(Array.from(e.target.files || []));
  }

  function toggleKeepExisting(index) {
    setExistingImages((s) => {
      const c = [...s];
      c[index] = { ...c[index], keep: !c[index].keep };
      return c;
    });
  }
  function removeExistingImage(index) {
    setExistingImages((s) => {
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

  async function uploadImagesIfAnyAndGetFinalImages() {
    // if no new files -> send kept images
    const keep = existingImages.filter(im => im.keep).map(im => im.raw ?? im.url);
    if (!newFiles || newFiles.length === 0) return keep;

    const fd = new FormData();
    newFiles.forEach(f => fd.append("images", f));
    fd.append("keepImages", JSON.stringify(keep));
    // send small meta if you want the upload route to update title etc
    fd.append("title", title ?? "");
    fd.append("slug", slug ?? "");

    const res = await axiosInstance.put(`/api/products/${id}/upload`, fd);
    return res.data.images || [];
  }

  async function handleSave(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const finalImages = await uploadImagesIfAnyAndGetFinalImages();
      const payload = {
        title, slug, price, mrp, stock, sku, brand, category, videoUrl,
        colors: stringToArray(colorsText),
        sizes: stringToArray(sizesText),
        description, published,
        images: finalImages
      };
      await axiosInstance.put(`/api/products/${id}`, payload);
      alert("Product updated");
      navigate("/admin/products");
    } catch (err) {
      console.error("Save failed:", err, err?.response?.data ?? "");
      alert("Save failed — check console");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div style={{ padding: 20 }}>Loading…</div>;

  // helper: safe onError handler for images (prevents infinite loop)
  const safeOnError = (e) => {
    try {
      const img = e.target;
      if (img.dataset.failed) return; // already failed once
      img.dataset.failed = "1";
      img.src = SVG_PLACEHOLDER;
    } catch (err) { /* no-op */ }
  };

  return (
    <div className="admin-edit-wrap">
      <h1>Edit product — {title}</h1>
      <button onClick={() => navigate("/admin/products")}>Back to products</button>

      <form onSubmit={handleSave} className="admin-edit-form">
        <div className="col-left">
          <label>Title<input value={title} onChange={e => setTitle(e.target.value)} /></label>
          <label>Slug<input value={slug} onChange={e => setSlug(e.target.value)} /></label>
          <label>Price<input value={price} onChange={e => setPrice(e.target.value)} /></label>
          <label>MRP<input value={mrp} onChange={e => setMrp(e.target.value)} /></label>
          <label>Stock<input value={stock} onChange={e => setStock(e.target.value)} /></label>
          <label>SKU<input value={sku} onChange={e => setSku(e.target.value)} /></label>
          <label>Brand<input value={brand} onChange={e => setBrand(e.target.value)} /></label>
          <label>Category<input value={category} onChange={e => setCategory(e.target.value)} /></label>
          <label>Video URL<input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} /></label>
        </div>

        <div className="col-right">
          <h4>Existing Images</h4>
          <div className="images-grid">
            {existingImages.length === 0 && <div>No existing images</div>}
            {existingImages.map((img, idx) => (
              <div key={idx} className="image-card" style={{ opacity: img.keep ? 1 : 0.5 }}>
                <img src={img.url || SVG_PLACEHOLDER} alt="" onError={safeOnError} />
                <div style={{display:"flex", gap:8, marginTop:6}}>
                  <label style={{fontSize:12}}>
                    <input type="checkbox" checked={img.keep} onChange={() => toggleKeepExisting(idx)} /> Keep
                  </label>
                  <button type="button" onClick={() => removeExistingImage(idx)}>Remove</button>
                </div>
              </div>
            ))}
          </div>

          <h4>Add Images</h4>
          <input type="file" multiple accept="image/*" onChange={handleFileChange} />
          <div className="images-grid">
            {newPreviews.map((src, i) => (
              <div key={i} className="image-card">
                <img src={src} alt="" onError={safeOnError} />
                <div><button type="button" onClick={() => removeNewPreview(i)}>Remove</button></div>
              </div>
            ))}
          </div>

          <label>Colors (comma-separated)<input value={colorsText} onChange={e => setColorsText(e.target.value)} placeholder="red, blue" /></label>
          <div className="color-swatches">
            {stringToArray(colorsText).map((c, i) => (
              <div key={i} className="swatch-item">
                <div className="swatch" style={{ backgroundColor: c }} title={c} />
                <span>{c}</span>
              </div>
            ))}
          </div>

          <label>Sizes (comma-separated)<input value={sizesText} onChange={e => setSizesText(e.target.value)} placeholder="S, M, L" /></label>

          <label>Description<textarea value={description} onChange={e => setDescription(e.target.value)} /></label>

          <label className="checkbox-row"><input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} /> Published</label>
        </div>

        <div style={{ width: "100%", marginTop: 12 }}>
          <button type="submit">Save</button>
          <button type="button" onClick={() => navigate("/admin/products")}>Done</button>
        </div>
      </form>
    </div>
  );
}
