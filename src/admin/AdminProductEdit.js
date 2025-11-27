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

export default function AdminProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [price, setPrice] = useState("");
  const [mrp, setMrp] = useState("");
  const [stock, setStock] = useState("");
  const [description, setDescription] = useState("");
  const [existingImages, setExistingImages] = useState([]);

  const [newFiles, setNewFiles] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await axiosInstance.get(`/api/products/${id}`);
        const p = res.data;

        setTitle(p.title ?? "");
        setSlug(p.slug ?? "");
        setPrice(p.price ?? "");
        setMrp(p.mrp ?? "");
        setStock(p.stock ?? "");
        setDescription(p.description ?? "");

        setExistingImages((p.images || []).map((img) => ({ url: img, raw: img })));

      } catch (err) {
        console.error("Fetch failed:", err);
        alert("Failed to fetch product");
      }
      setLoading(false);
    }

    load();
  }, [id]);

  useEffect(() => {
    if (!newFiles.length) return setNewPreviews([]);

    const arr = [];
    newFiles.forEach((f, i) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        arr[i] = e.target.result;
        if (arr.filter(Boolean).length === newFiles.length) setNewPreviews(arr);
      };
      reader.readAsDataURL(f);
    });
  }, [newFiles]);

  function handleFileChange(e) {
    setNewFiles(Array.from(e.target.files || []));
  }

  async function uploadImagesIfAny() {
    if (!newFiles.length) return existingImages.map((i) => i.raw);

    const fd = new FormData();
    newFiles.forEach((f) => fd.append("images", f));

    // send keepImages so backend knows which to retain
    fd.append("keepImages", JSON.stringify(existingImages.map((i) => i.raw)));

    const res = await axiosInstance.put(`/api/products/${id}/upload`, fd);
    return res.data.images;
  }

  async function handleSave(e) {
    e.preventDefault();

    try {
      const finalImages = await uploadImagesIfAny();

      const payload = {
        title,
        slug,
        price,
        mrp,
        stock,
        description,
        images: finalImages
      };

      await axiosInstance.put(`/api/products/${id}`, payload);

      alert("Product updated!");
      navigate("/admin/products");

    } catch (err) {
      console.error("Save failed:", err);
      alert("Save failed — see console");
    }
  }

  if (loading) return <div style={{ padding: 20 }}>Loading…</div>;

  return (
    <div className="admin-edit-wrap">
      <h1>Edit product — {title}</h1>
      <button onClick={() => navigate("/admin/products")}>Back</button>

      <form onSubmit={handleSave} className="admin-edit-form">
        <div className="col-left">
          <label>Title <input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
          <label>Slug <input value={slug} onChange={(e) => setSlug(e.target.value)} /></label>
          <label>Price <input value={price} onChange={(e) => setPrice(e.target.value)} /></label>
          <label>MRP <input value={mrp} onChange={(e) => setMrp(e.target.value)} /></label>
          <label>Stock <input value={stock} onChange={(e) => setStock(e.target.value)} /></label>
          <label>Description <textarea value={description} onChange={(e) => setDescription(e.target.value)} /></label>
        </div>

        <div className="col-right">
          <h4>Existing Images</h4>
          <div className="images-grid">
            {existingImages.map((img, i) => (
              <div className="image-card" key={i}>
                <img src={img.url} alt="" />
              </div>
            ))}
          </div>

          <h4>Add Images</h4>
          <input type="file" multiple accept="image/*" onChange={handleFileChange} />
          <div className="images-grid">
            {newPreviews.map((src, i) => (
              <div key={i} className="image-card">
                <img src={src} alt="" />
              </div>
            ))}
          </div>
        </div>

        <div style={{ width: "100%", marginTop: 12 }}>
          <button type="submit">Save</button>
        </div>
      </form>
    </div>
  );
}
