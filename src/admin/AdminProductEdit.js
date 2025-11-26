// src/admin/AdminProductEdit.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance"; // adjust path if different
import "./AdminProductEdit.css"; // optional: create styles below or put styles in your main CSS

function stringToArray(str) {
  if (!str && !Array.isArray(str)) return [];
  if (Array.isArray(str)) return str;
  return str
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
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
  const [product, setProduct] = useState(null);

  // form state
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
  const [existingImages, setExistingImages] = useState([]); // objects expected: { url: "...", _id: "..." } or string
  const [newFiles, setNewFiles] = useState([]); // File objects
  const [newPreviews, setNewPreviews] = useState([]); // dataURLs for preview

  // base for existing images: prefer absolute URL from API; fallback to env var
  const API_BASE = process.env.REACT_APP_API_URL || "";

  useEffect(() => {
    async function fetchProduct() {
      setLoading(true);
      try {
        const res = await axiosInstance.get(`/admin/products/${id}`);
        // adapt to the shape of your response
        const data = res.data?.product ?? res.data;
        setProduct(data);

        setTitle(data.title || "");
        setSlug(data.slug || "");
        setPrice(data.price ?? "");
        setMrp(data.mrp ?? "");
        setStock(data.stock ?? "");
        setSku(data.sku || "");
        setBrand(data.brand || "");
        setCategory(data.category || "");
        setVideoUrl(data.videoUrl || data.video || "");
        setColorsText(arrayToString(data.colors || data.colours || []));
        setSizesText(arrayToString(data.sizes || []));
        setDescription(data.description || "");
        setPublished(Boolean(data.published));

        // Normalize existing images to objects with absolute URL
        const imgs = (data.images || data.image || []).map((img) => {
          if (!img) return null;
          // If img is an object { url: ... } or string
          let url = typeof img === "string" ? img : img.url || img.path || img.filename;
          if (url && !url.startsWith("http")) {
            // prepend base API URL if not absolute
            url = API_BASE.replace(/\/$/, "") + "/" + url.replace(/^\/+/, "");
          }
          return { url, raw: img };
        }).filter(Boolean);
        setExistingImages(imgs);
      } catch (err) {
        console.error("Failed to load product", err);
        // optionally show toast
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // preview newly chosen files
  useEffect(() => {
    if (!newFiles || newFiles.length === 0) {
      setNewPreviews([]);
      return;
    }
    const readers = [];
    const previews = [];
    newFiles.forEach((file, idx) => {
      const reader = new FileReader();
      readers.push(reader);
      reader.onload = (e) => {
        previews[idx] = e.target.result;
        // when all are loaded update
        if (previews.filter(Boolean).length === newFiles.length) {
          setNewPreviews(previews);
        }
      };
      reader.readAsDataURL(file);
    });

    return () => {
      // cleanup not required for FileReader
    };
  }, [newFiles]);

  function handleFileChange(e) {
    const files = Array.from(e.target.files || []);
    setNewFiles(files);
  }

  function removeExistingImage(index) {
    const copy = [...existingImages];
    copy.splice(index, 1);
    setExistingImages(copy);
  }

  function removeNewPreview(index) {
    const copyFiles = [...newFiles];
    const copyPreviews = [...newPreviews];
    copyFiles.splice(index, 1);
    copyPreviews.splice(index, 1);
    setNewFiles(copyFiles);
    setNewPreviews(copyPreviews);
  }

  async function handleSave(e) {
    e.preventDefault();

    // Prepare payload
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
      // how you pass images depends on your backend - do not blindly include previews
    };

    try {
      // 1) Send main product fields first
      const res = await axiosInstance.put(`/admin/products/${id}`, payload);
      // If your backend expects images in same request as multipart, you'll need FormData instead.
      // If adding images is a separate endpoint (common), use that endpoint below.

      // 2) Upload new files if any (example for multipart endpoint /admin/products/:id/images)
      if (newFiles.length > 0) {
        // Example: multipart POST to add images
        const fd = new FormData();
        newFiles.forEach((f) => fd.append("images", f));
        // option A: upload to /admin/products/:id/images
        try {
          await axiosInstance.post(`/admin/products/${id}/images`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } catch (uploadErr) {
          console.warn("Image upload failed or endpoint different", uploadErr);
          // If your backend uses pre-signed URLs or a different endpoint, implement that flow here.
        }
      }

      // 3) If you removed existing images locally, inform backend (example)
      // Many backends expect an array of images to be sent or separate delete calls.
      // Example: send final list of existing image identifiers (if available)
      // await axiosInstance.put(`/admin/products/${id}/images-list`, { images: existingImages.map(i => i.raw) });

      // Success: navigate back or refresh
      navigate("/admin/products");
    } catch (err) {
      console.error("Save failed", err);
      // show error to user
    }
  }

  if (loading) return <div>Loading...</div>;

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
            <h4>Existing images</h4>
            <div className="images-grid">
              {existingImages.map((img, idx) => (
                <div key={idx} className="image-card">
                  <img src={img.url} alt={`existing-${idx}`} onError={(e)=>{ e.target.src = "/placeholder.png"; }} />
                  <button type="button" onClick={() => removeExistingImage(idx)}>Remove</button>
                </div>
              ))}
            </div>

            <h4>Add new images</h4>
            <input type="file" multiple accept="image/*" onChange={handleFileChange} />
            <div className="images-grid">
              {newPreviews.map((p, idx) => (
                <div key={idx} className="image-card">
                  <img src={p} alt={`preview-${idx}`} />
                  <button type="button" onClick={() => removeNewPreview(idx)}>Remove</button>
                </div>
              ))}
            </div>
          </div>

          <label>Colors (comma-separated)
            <input value={colorsText} onChange={(e) => setColorsText(e.target.value)} placeholder="e.g. red, blue, navy" />
          </label>

          <div className="color-swatches">
            {stringToArray(colorsText).map((c, i) => (
              <div key={i} className="swatch-item">
                <div className="swatch" style={{ backgroundColor: c }} title={c} />
                <span>{c}</span>
              </div>
            ))}
          </div>

          <label>Sizes (comma-separated)
            <input value={sizesText} onChange={(e) => setSizesText(e.target.value)} placeholder="e.g. S, M, L" />
          </label>

          <label>Description
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>

          <label className="checkbox-row"><input type="checkbox" checked={published} onChange={(e)=>setPublished(e.target.checked)} /> Published</label>

        </div>

        <div className="form-actions">
          <button type="submit">Save</button>
          <button type="button" onClick={() => navigate("/admin/products")}>Done</button>
        </div>
      </form>
    </div>
  );
}
