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
  const API_BASE = process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace(/\/$/, "") : "";

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
    async function fetchFrom(url) {
      try {
        const r = await axiosInstance.get(url);
        return r;
      } catch (err) {
        // bubble up the error
        throw err;
      }
    }

    async function fetchProduct() {
      setLoading(true);
      let res = null;
      const tried = [];

      // Try common endpoints: admin then public
      const endpoints = [
        `/admin/products/${id}`,
        `/products/${id}`,
      ];

      for (const ep of endpoints) {
        try {
          tried.push(ep);
          res = await fetchFrom(ep);
          if (res) break;
        } catch (err) {
          // if 404 or network error, continue to next
          // console.log will show errors
          console.warn(`fetch ${ep} failed:`, err && err.response ? err.response.status : err.message);
        }
      }

      console.log("Tried endpoints:", tried, "final response:", res);

      if (!res) {
        // failed to fetch product
        setLoading(false);
        console.error("Could not fetch product from tried endpoints");
        return;
      }

      // Normalize response: try several common shapes
      let data = res.data;
      // sometimes response is { product: {...} } or { result: {...} } or directly the object
      let product = data?.product ?? data?.result ?? data?.data ?? data;

      // If product includes wrappers like { product: { data: {...} } }
      if (product && product.product) product = product.product;
      if (product && product.data) product = product.data;

      console.log("Normalized product object:", product);

      // Defensive defaults
      setTitle(product?.title ?? product?.name ?? "");
      setSlug(product?.slug ?? "");
      setPrice(product?.price ?? "");
      setMrp(product?.mrp ?? "");
      setStock(product?.stock ?? "");
      setSku(product?.sku ?? "");
      setBrand(product?.brand ?? "");
      setCategory(product?.category ?? product?.cat ?? "");
      setVideoUrl(product?.videoUrl ?? product?.video ?? "");
      const colours = product?.colors ?? product?.colours ?? product?.colour ?? product?.color ?? [];
      setColorsText(Array.isArray(colours) ? arrayToString(colours) : String(colours ?? ""));
      const sizes = product?.sizes ?? product?.size ?? [];
      setSizesText(Array.isArray(sizes) ? arrayToString(sizes) : String(sizes ?? ""));
      setDescription(product?.description ?? "");
      setPublished(Boolean(product?.published));

      // Normalize images array
      let imgs = product?.images ?? product?.image ?? product?.photos ?? [];
      if (!Array.isArray(imgs) && imgs) {
        // could be comma-separated string or single string
        if (typeof imgs === "string") {
          imgs = imgs.split(",").map(s => s.trim()).filter(Boolean);
        } else {
          imgs = [imgs];
        }
      }
      const normalized = imgs.map((img) => {
        if (!img) return null;
        // img could be string (url or path) or object { url, path, filename }
        let url = typeof img === "string" ? img : img.url || img.path || img.filename || "";
        if (url && !/^https?:\/\//i.test(url)) {
          // prefix API base if provided
          if (API_BASE) url = `${API_BASE}/${url.replace(/^\/+/, "")}`;
        }
        return { url, raw: img };
      }).filter(Boolean);
      console.log("Normalized images:", normalized);
      setExistingImages(normalized);

      setLoading(false);
    }

    fetchProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // preview newly chosen files
  useEffect(() => {
    if (!newFiles || newFiles.length === 0) return setNewPreviews([]);
    const readers = [];
    const previews = [];
    newFiles.forEach((file, idx) => {
      const reader = new FileReader();
      readers.push(reader);
      reader.onload = (e) => {
        previews[idx] = e.target.result;
        if (previews.filter(Boolean).length === newFiles.length) {
          setNewPreviews(previews);
        }
      };
      reader.readAsDataURL(file);
    });
    return () => {};
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
      // images: existingImages.map(i => i.raw || i.url) // adapt if backend expects
    };

    console.log("Saving payload:", payload);

    try {
      // attempt to update main product (some backends require admin prefix)
      const res = await axiosInstance.put(`/admin/products/${id}`, payload).catch(async (err) => {
        console.warn("PUT /admin/products failed, trying /products/:id", err && err.response && err.response.status);
        return axiosInstance.put(`/products/${id}`, payload);
      });

      // upload new files if any (example, adapt to your backend)
      if (newFiles.length > 0) {
        const fd = new FormData();
        newFiles.forEach(f => fd.append("images", f));
        try {
          await axiosInstance.post(`/admin/products/${id}/images`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } catch (uErr) {
          console.warn("Uploading new files failed; your backend might expect presigned flow.", uErr);
        }
      }

      // after save - refresh or navigate
      navigate("/admin/products");
    } catch (err) {
      console.error("Save failed", err);
      alert("Save failed — check console and network tab for details.");
    }
  }

  if (loading) return <div style={{padding:20}}>Loading...</div>;

  return (
    <div className="admin-edit-wrap">
      <h1>Edit product — {title || " "}</h1>
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
              {existingImages.length === 0 && <div>No existing images</div>}
              {existingImages.map((img, idx) => (
                <div key={idx} className="image-card">
                  <img src={img.url || "/placeholder.png"} alt={`existing-${idx}`} onError={(e)=>{ e.target.src = "/placeholder.png"; }} />
                  <button type="button" onClick={() => removeExistingImage(idx)}>×</button>
                </div>
              ))}
            </div>

            <h4>Add new images</h4>
            <input type="file" multiple accept="image/*" onChange={handleFileChange} />
            <div className="images-grid">
              {newPreviews.map((p, idx) => (
                <div key={idx} className="image-card">
                  <img src={p} alt={`preview-${idx}`} />
                  <button type="button" onClick={() => removeNewPreview(idx)}>×</button>
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

        <div style={{width:"100%", marginTop:12}}>
          <button type="submit">Save</button>
          <button type="button" onClick={() => navigate("/admin/products")}>Done</button>
        </div>
      </form>
    </div>
  );
}
