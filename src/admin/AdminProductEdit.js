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

export default function AdminProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // product fields
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
  // existingImages: { url, raw, keep: true/false }
  const [existingImages, setExistingImages] = useState([]);
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
          // normalize to absolute url already done by backend routes
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

  // preview new files
  useEffect(() => {
    if (!newFiles || newFiles.length === 0) return setNewPreviews([]);
    const previews = [];
    newFiles.forEach((f, idx) => {
      const r = new FileReader();
      r.onload = (e) => {
        previews[idx] = e.target.result;
        if (previews.filter(Boolean).length === newFiles.length) setNewPreviews(previews);
      };
      r.readAsDataURL(f);
    });
  }, [newFiles]);

  function handleFileChange(e) {
    setNewFiles(Array.from(e.target.files || []));
  }

  function toggleKeepExisting(index) {
    setExistingImages((arr) => {
      const copy = [...arr];
      copy[index] = { ...copy[index], keep: !copy[index].keep };
      return copy;
    });
  }

  function removeExistingImage(index) {
    // mark not kept, but keep list item so admin sees it (or we can remove)
    setExistingImages((arr) => {
      const copy = [...arr];
      copy[index] = { ...copy[index], keep: false };
      return copy;
    });
  }

  function removeNewPreview(index) {
    const a = [...newFiles];
    const b = [...newPreviews];
    a.splice(index, 1);
    b.splice(index, 1);
    setNewFiles(a);
    setNewPreviews(b);
  }

  // Upload new images via multipart then update product JSON
  async function uploadImagesIfAnyAndGetFinalImages() {
    // If no new files, just return kept existing image raw values
    if (!newFiles || newFiles.length === 0) {
      return existingImages.filter(i => i.keep).map(i => i.raw ?? i.url);
    }

    // Prepare FormData for upload route (productRoutes.cjs PUT /:id/upload expects "images" files
    const fd = new FormData();
    newFiles.forEach((f) => fd.append("images", f));
    // pass keepImages (existing image paths the admin wants to keep)
    const keep = existingImages.filter(i => i.keep).map(i => i.raw ?? i.url);
    fd.append("keepImages", JSON.stringify(keep));
    // other fields (optional): title/slug etc — upload route updates product if provided
    // send minimal meta to keep product consistent
    fd.append("title", title ?? "");
    fd.append("slug", slug ?? "");

    const res = await axiosInstance.put(`/api/products/${id}/upload`, fd, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    // response returns product object with images absolute URLs
    return res.data.images || [];
  }

  async function handleSave(e) {
    e.preventDefault();
    setLoading(true);
    try {
      // first, ensure images are uploaded/kept as desired
      const finalImages = await uploadImagesIfAnyAndGetFinalImages();

      // prepare payload — note backend allowed list is controlled by productRoutes.cjs
      const payload = {
        title,
        slug,
        price,
        mrp,
        stock,
        sku,
        brand,
        category,
        videoUrl,
        colors: stringToArray(colorsText),
        sizes: stringToArray(sizesText),
        description,
        published,
        images: finalImages,
      };

      // JSON update
      await axiosInstance.put(`/api/products/${id}`, payload);

      alert("Product updated successfully.");
      navigate("/admin/products");
    } catch (err) {
      console.error("Save failed:", err, err?.response?.data ?? "");
      alert("Save failed — check console and network tab.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div style={{ padding: 20 }}>Loading…</div>;

  return (
    <div className="admin-edit-wrap">
      <h1>Edit product — {title}</h1>
      <button onClick={() => navigate("/admin/products")}>Back to products</button>

      <form onSubmit={handleSave} className="admin-edit-form">
        <div className="col-left">
          <label>Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>

          <label>Slug
            <input value={slug} onChange={(e) => setSlug(e.target.value)} />
          </label>

          <label>Price
            <input value={price} onChange={(e) => setPrice(e.target.value)} />
          </label>

          <label>MRP
            <input value={mrp} onChange={(e) => setMrp(e.target.value)} />
          </label>

          <label>Stock
            <input value={stock} onChange={(e) => setStock(e.target.value)} />
          </label>

          <label>SKU
            <input value={sku} onChange={(e) => setSku(e.target.value)} />
          </label>

          <label>Brand
            <input value={brand} onChange={(e) => setBrand(e.target.value)} />
          </label>

          <label>Category
            <input value={category} onChange={(e) => setCategory(e.target.value)} />
          </label>

          <label>Video URL
            <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
          </label>
        </div>

        <div className="col-right">
          <div className="images-section">
            <h4>Existing Images</h4>
            <div className="images-grid">
              {existingImages.length === 0 && <div>No existing images</div>}
              {existingImages.map((img, idx) => (
                <div className="image-card" key={idx} style={{ opacity: img.keep ? 1 : 0.5 }}>
                  <img src={img.url || "/placeholder.png"} alt={`existing-${idx}`} onError={(e)=>e.target.src="/placeholder.png"} />
                  <div style={{display:"flex", alignItems:"center", gap:6, marginTop:6}}>
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
              {newPreviews.map((p, i) => (
                <div className="image-card" key={i}>
                  <img src={p} alt={`preview-${i}`} />
                  <button type="button" onClick={() => removeNewPreview(i)}>Remove</button>
                </div>
              ))}
            </div>
          </div>

          <label>Colors (comma-separated)
            <input value={colorsText} onChange={(e) => setColorsText(e.target.value)} placeholder="red, blue" />
          </label>

          <div className="color-swatches">
            {stringToArray(colorsText).map((c, i) => (
              <div className="swatch-item" key={i}>
                <div className="swatch" style={{ backgroundColor: c }} title={c} />
                <span>{c}</span>
              </div>
            ))}
          </div>

          <label>Sizes (comma-separated)
            <input value={sizesText} onChange={(e) => setSizesText(e.target.value)} placeholder="S, M, L" />
          </label>

          <label>Description
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>

          <label className="checkbox-row">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} /> Published
          </label>
        </div>

        <div style={{ width: "100%", marginTop: 12 }}>
          <button type="submit">Save</button>
          <button type="button" onClick={() => navigate("/admin/products")}>Done</button>
        </div>
      </form>
    </div>
  );
}
