import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";

export default function AdminProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [product, setProduct] = useState(null);

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [mrp, setMrp] = useState("");
  const [description, setDescription] = useState("");
  const [stock, setStock] = useState("");
  const [sku, setSku] = useState("");

  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);

  const [existingImages, setExistingImages] = useState([]);
  const [removedExisting, setRemovedExisting] = useState(new Set());

  const [newFiles, setNewFiles] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);

  useEffect(() => {
    async function loadProduct() {
      try {
        const res = await axiosInstance.get(`/api/products/${id}`);
        const p = res.data;

        setProduct(p);
        setTitle(p.title || "");
        setPrice(p.price || "");
        setMrp(p.mrp || "");
        setDescription(p.description || "");
        setStock(p.stock || "");
        setSku(p.sku || "");
        setColors(Array.isArray(p.colors) ? p.colors : []);
        setSizes(Array.isArray(p.sizes) ? p.sizes : []);
        setExistingImages(Array.isArray(p.images) ? p.images : []);
      } catch (err) {
        setError("Failed to load product");
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [id]);

  function handleNewFiles(e) {
    const files = Array.from(e.target.files || []);
    setNewFiles(files);
    setNewPreviews(files.map((f) => URL.createObjectURL(f)));
  }

  function toggleRemoveExisting(index) {
    const copy = new Set(removedExisting);
    if (copy.has(index)) copy.delete(index);
    else copy.add(index);
    setRemovedExisting(copy);
  }

  function keepImages() {
    return existingImages.filter((_, idx) => !removedExisting.has(idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("price", price);
      fd.append("mrp", mrp);
      fd.append("description", description);
      fd.append("stock", stock);
      fd.append("sku", sku);
      fd.append("colors", JSON.stringify(colors));
      fd.append("sizes", JSON.stringify(sizes));
      fd.append("keepImages", JSON.stringify(keepImages()));

      newFiles.forEach((f) => fd.append("images", f));

      await axiosInstance.put(`/api/products/${id}/upload`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      navigate("/admin/products");
    } catch (err) {
      console.error(err);
      setError("Update failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div>Loading…</div>;

  return (
    <div style={{ maxWidth: 800, padding: 20 }}>
      <h2>Edit Product</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}

      <form onSubmit={handleSubmit}>

        <label>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />

        <label>Price</label>
        <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />

        <label>MRP</label>
        <input type="number" value={mrp} onChange={(e) => setMrp(e.target.value)} />

        <label>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} />

        <label>Stock</label>
        <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} />

        <label>SKU</label>
        <input value={sku} onChange={(e) => setSku(e.target.value)} />

        <h3>Existing Images</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {existingImages.map((img, index) => (
            <div key={index} style={{ position: "relative" }}>
              <img src={img} style={{ width: 120, height: 120, objectFit: "cover" }} />
              <button
                type="button"
                onClick={() => toggleRemoveExisting(index)}
                style={{
                  position: "absolute",
                  top: 5,
                  right: 5,
                  background: removedExisting.has(index) ? "green" : "red",
                  color: "#fff",
                }}>
                {removedExisting.has(index) ? "Undo" : "X"}
              </button>
            </div>
          ))}
        </div>

        <h3>Add New Images</h3>
        <input type="file" multiple onChange={handleNewFiles} />

        {newPreviews.length > 0 && (
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            {newPreviews.map((p, i) => (
              <img key={i} src={p} style={{ width: 120, height: 120, objectFit: "cover" }} />
            ))}
          </div>
        )}

        <button disabled={saving} type="submit" style={{ marginTop: 20 }}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
