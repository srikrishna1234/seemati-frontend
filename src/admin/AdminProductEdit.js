// src/admin/AdminProductEdit.js
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import "./AdminProductEdit.css";

/*
 Full replacement AdminProductEdit.js

 Goals:
 - Aggressively try many likely endpoints for a single product GET.
 - If single-item endpoints 404, try list endpoints and find product by id.
 - Normalize many common response shapes and populate the form.
 - Log every attempt and the normalized object so you (or I) can read DevTools console
   and tell exactly which endpoint returned the data.
 - Keep UI as two-column, image previews, color swatches, etc.
*/

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

  // ---------- Fetch helpers ----------
  async function tryGet(endpoint) {
    try {
      const res = await axiosInstance.get(endpoint);
      return { ok: true, endpoint, res };
    } catch (err) {
      return { ok: false, endpoint, err, status: err?.response?.status, data: err?.response?.data };
    }
  }

  function normalizeProduct(raw) {
    // raw may be the product, or an object that wraps it { product: {...} }, { data: {...} }, etc.
    let product = raw?.product ?? raw?.result ?? raw?.data ?? raw;
    if (!product) return null;
    if (product?.product) product = product.product;
    if (product?.data) product = product.data;
    return product;
  }

  function normalizeImagesFromProduct(product) {
    let imgs = product?.images ?? product?.image ?? product?.photos ?? [];
    if (!Array.isArray(imgs) && imgs) {
      if (typeof imgs === "string") imgs = imgs.split(",").map(s => s.trim()).filter(Boolean);
      else imgs = [imgs];
    }
    const normalized = imgs.map((img) => {
      if (!img) return null;
      let url = typeof img === "string" ? img : img.url || img.path || img.filename || "";
      if (url && !/^https?:\/\//i.test(url)) {
        if (API_BASE) url = `${API_BASE}/${url.replace(/^\/+/, "")}`;
      }
      return { url, raw: img };
    }).filter(Boolean);
    return normalized;
  }

  // ---------- Primary fetch logic ----------
  useEffect(() => {
    async function fetchProductAggressive() {
      setLoading(true);

      const singleEndpoints = [
        `/admin/products/${id}`,
        `/products/${id}`,
        `/admin/product/${id}`,
        `/product/${id}`,
        `/api/admin/products/${id}`,
        `/api/products/${id}`,
        `/v1/products/${id}`,
        `/v1/admin/products/${id}`,
        `/admin/products/get/${id}`,
        `/admin/products?id=${id}`, // sometimes uses query param
      ];

      const listEndpoints = [
        `/admin/products`,
        `/products`,
        `/api/products`,
        `/v1/products`,
      ];

      const tried = [];

      // 1) Try single-item endpoints first
      for (const ep of singleEndpoints) {
        const r = await tryGet(ep);
        tried.push(r);
        if (r.ok && r.res && r.res.data) {
          console.log("[AdminEdit] Found product at", ep, r.res.data);
          const product = normalizeProduct(r.res.data);
          console.log("[AdminEdit] Normalized product:", product);
          if (product) {
            populateFromProduct(product);
            setLoading(false);
            return;
          }
        } else {
          console.warn("[AdminEdit] attempt failed for", ep, "status:", r.status, "data:", r.data);
        }
      }

      // 2) If none of the single-item endpoints returned the product,
      // try list endpoints and search for the product by id
      for (const le of listEndpoints) {
        const r = await tryGet(le);
        tried.push(r);
        if (r.ok && r.res && r.res.data) {
          const payload = r.res.data;
          // payload may be array directly, or wrapped { products: [...] } etc.
          let list = payload;
          if (!Array.isArray(list)) {
            // try common wrappers
            list = payload?.products ?? payload?.data ?? payload?.result ?? payload?.items ?? list;
          }
          if (Array.isArray(list)) {
            // try to find by matching _id or id (some APIs use id or _id)
            const found = list.find(p => String(p._id ?? p.id ?? p._doc?._id ?? "") === String(id));
            if (found) {
              console.log("[AdminEdit] Found product inside list endpoint", le, "product:", found);
              const product = normalizeProduct(found);
              populateFromProduct(product ?? found);
              setLoading(false);
              return;
            }
          } else {
            console.log("[AdminEdit] list endpoint returned non-array payload for", le, payload);
          }
        } else {
          console.warn("[AdminEdit] list attempt failed for", le, "status:", r.status);
        }
      }

      // 3) If still nothing, log everything (for debugging) and stop
      console.error("[AdminEdit] Could not find product. Tried endpoints:", tried.map(t => ({ endpoint: t.endpoint, ok: t.ok, status: t.status })));
      setLoading(false);
    }

    function populateFromProduct(product) {
      if (!product) return;
      setTitle(product?.title ?? product?.name ?? "");
      setSlug(product?.slug ?? "");
      setPrice(product?.price ?? product?.mrp ?? "");
      setMrp(product?.mrp ?? "");
      setStock(product?.stock ?? product?.quantity ?? "");
      setSku(product?.sku ?? "");
      setBrand(product?.brand ?? "");
      setCategory(product?.category ?? product?.cat ?? "");
      setVideoUrl(product?.videoUrl ?? product?.video ?? "");
      const colours = product?.colors ?? product?.colours ?? product?.color ?? [];
      setColorsText(Array.isArray(colours) ? arrayToString(colours) : String(colours ?? ""));
      const sizes = product?.sizes ?? product?.size ?? [];
      setSizesText(Array.isArray(sizes) ? arrayToString(sizes) : String(sizes ?? ""));
      setDescription(product?.description ?? "");
      setPublished(Boolean(product?.published));
      const imgs = normalizeImagesFromProduct(product);
      setExistingImages(imgs);
    }

    fetchProductAggressive();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ---------- file preview logic ----------
  useEffect(() => {
    if (!newFiles || newFiles.length === 0) {
      setNewPreviews([]);
      return;
    }
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

  // ---------- save ----------
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
      // images: existingImages.map(i => i.raw ?? i.url) // adapt if backend expects
    };

    console.log("[AdminEdit] Saving payload:", payload);

    try {
      // try admin PUT then public PUT
      let res;
      try {
        res = await axiosInstance.put(`/admin/products/${id}`, payload);
      } catch (err) {
        console.warn("[AdminEdit] PUT /admin/products failed, trying /products/:id", err?.response?.status);
        res = await axiosInstance.put(`/products/${id}`, payload);
      }

      // handle new file uploads if backend supports multipart endpoint
      if (newFiles.length > 0) {
        try {
          const fd = new FormData();
          newFiles.forEach(f => fd.append("images", f));
          await axiosInstance.post(`/admin/products/${id}/images`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } catch (uErr) {
          console.warn("[AdminEdit] image upload failed or endpoint different:", uErr);
        }
      }

      // done
      navigate("/admin/products");
    } catch (err) {
      console.error("[AdminEdit] Save failed:", err);
      alert("Save failed — check console and network tab for details.");
    }
  }

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

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
                  <img src={img.url || "/placeholder.png"} alt={`existing-${idx}`} onError={(e) => { e.target.src = "/placeholder.png"; }} />
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

          <label className="checkbox-row"><input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} /> Published</label>

        </div>

        <div style={{ width: "100%", marginTop: 12 }}>
          <button type="submit">Save</button>
          <button type="button" onClick={() => navigate("/admin/products")}>Done</button>
        </div>
      </form>
    </div>
  );
}
