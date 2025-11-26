// src/admin/AdminProductEdit.js
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import "./AdminProductEdit.css";

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

export default function AdminProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const API_BASE = process.env.REACT_APP_API_URL
    ? process.env.REACT_APP_API_URL.replace(/\/$/, "")
    : "";

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

  const [existingImages, setExistingImages] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await axiosInstance.get(`/admin/products/${id}`);
        let product = res.data?.product ?? res.data?.data ?? res.data;

        if (product?.product) product = product.product;

        setTitle(product?.title ?? "");
        setSlug(product?.slug ?? "");
        setPrice(product?.price ?? "");
        setMrp(product?.mrp ?? "");
        setStock(product?.stock ?? "");
        setSku(product?.sku ?? "");
        setBrand(product?.brand ?? "");
        setCategory(product?.category ?? "");
        setVideoUrl(product?.videoUrl ?? "");
        setColorsText(arrayToString(product?.colors ?? []));
        setSizesText(arrayToString(product?.sizes ?? []));
        setDescription(product?.description ?? "");
        setPublished(Boolean(product?.published));

        // Normalize images
        let imgs = product?.images ?? [];
        if (!Array.isArray(imgs)) imgs = [imgs];
        const normalized = imgs
          .map((img) => {
            if (!img) return null;
            let url = typeof img === "string" ? img : img.url || img.path;
            if (url && !/^https?:\/\//.test(url)) {
              if (API_BASE) url = `${API_BASE}/${url.replace(/^\/+/, "")}`;
            }
            return { url, raw: img };
          })
          .filter(Boolean);
        setExistingImages(normalized);
      } catch (err) {
        console.error("Fetch product failed:", err);
      }
      setLoading(false);
    }

    load();
  }, [id]);

  // Preview new files
  useEffect(() => {
    if (!newFiles?.length) return setNewPreviews([]);

    const previews = [];
    newFiles.forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        previews[idx] = e.target.result;
        if (previews.filter(Boolean).length === newFiles.length) {
          setNewPreviews(previews);
        }
      };
      reader.readAsDataURL(file);
    });
  }, [newFiles]);

  function handleFileChange(e) {
    setNewFiles(Array.from(e.target.files || []));
  }

  function removeExistingImage(i) {
    const arr = [...existingImages];
    arr.splice(i, 1);
    setExistingImages(arr);
  }

  function removeNewPreview(i) {
    const a = [...newFiles];
    const b = [...newPreviews];
    a.splice(i, 1);
    b.splice(i, 1);
    setNewFiles(a);
    setNewPreviews(b);
  }

  // FINAL SAVE FUNCTION – CORRECT ROUTE
  async function handleSave(e) {
    e.preventDefault();

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
      images: existingImages.map((i) => i.raw ?? i.url)
    };

    try {
      await axiosInstance.put(`/admin/products/${id}`, payload);
      navigate("/admin/products");
    } catch (err) {
      console.error("SAVE FAILED:", err);
      alert("Save failed — check console and network tab for details.");
    }
  }

  if (loading) return <div style={{ padding: 20 }}>Loading…</div>;

  return (
    <div className="admin-edit-wrap">
      <h1>Edit product — {title}</h1>
      <button onClick={() => navigate("/admin/products")}>Back to products</button>

      <form onSubmit={handleSave} className="admin-edit-form">
        <div className="col-left">
          <label>Title <input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
          <label>Slug <input value={slug} onChange={(e) => setSlug(e.target.value)} /></label>
          <label>Price <input value={price} onChange={(e) => setPrice(e.target.value)} /></label>
          <label>MRP <input value={mrp} onChange={(e) => setMrp(e.target.value)} /></label>
          <label>Stock <input value={stock} onChange={(e) => setStock(e.target.value)} /></label>
          <label>SKU <input value={sku} onChange={(e) => setSku(e.target.value)} /></label>
          <label>Brand <input value={brand} onChange={(e) => setBrand(e.target.value)} /></label>
          <label>Category <input value={category} onChange={(e) => setCategory(e.target.value)} /></label>
          <label>Video URL <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} /></label>
        </div>

        <div className="col-right">

          <h4>Existing images</h4>
          <div className="images-grid">
            {existingImages.map((img, idx) => (
              <div className="image-card" key={idx}>
                <img src={img.url} alt="" />
                <button type="button" onClick={() => removeExistingImage(idx)}>×</button>
              </div>
            ))}
          </div>

          <h4>Add new images</h4>
          <input type="file" multiple accept="image/*" onChange={handleFileChange} />

          <div className="images-grid">
            {newPreviews.map((src, idx) => (
              <div className="image-card" key={idx}>
                <img src={src} alt="" />
                <button type="button" onClick={() => removeNewPreview(idx)}>×</button>
              </div>
            ))}
          </div>

          <label>Colors (comma-separated)
            <input value={colorsText} onChange={(e) => setColorsText(e.target.value)} />
          </label>

          <div className="color-swatches">
            {stringToArray(colorsText).map((c, i) => (
              <div key={i} className="swatch-item">
                <div className="swatch" style={{ backgroundColor: c }} />
                <span>{c}</span>
              </div>
            ))}
          </div>

          <label>Sizes (comma-separated)
            <input value={sizesText} onChange={(e) => setSizesText(e.target.value)} />
          </label>

          <label>Description
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>

          <label className="checkbox-row">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            Published
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
