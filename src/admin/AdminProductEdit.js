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

  // Try multiple endpoints for GET product
  useEffect(() => {
    async function tryGet(url) {
      try {
        const res = await axiosInstance.get(url);
        return { ok: true, url, data: res.data, res };
      } catch (err) {
        return { ok: false, url, err, status: err?.response?.status, data: err?.response?.data };
      }
    }

    function normalizeProduct(raw) {
      if (!raw) return null;
      let obj = raw?.product ?? raw?.data ?? raw?.result ?? raw;
      if (obj?.product) obj = obj.product;
      if (obj?.data) obj = obj.data;
      return obj;
    }

    function normalizeImgs(product) {
      let imgs = product?.images ?? product?.image ?? product?.photos ?? [];
      if (!Array.isArray(imgs) && imgs) {
        if (typeof imgs === "string") imgs = imgs.split(",").map(s => s.trim()).filter(Boolean);
        else imgs = [imgs];
      }
      return imgs.map(img => {
        if (!img) return null;
        let url = typeof img === "string" ? img : img.url || img.path || img.filename || "";
        if (url && !/^https?:\/\//i.test(url)) {
          if (API_BASE) url = `${API_BASE}/${url.replace(/^\/+/, "")}`;
        }
        return { url, raw: img };
      }).filter(Boolean);
    }

    async function fetchAggressive() {
      setLoading(true);

      // probable single-item endpoints
      const singles = [
        `/admin/products/${id}`,
        `/admin/products/edit/${id}`,
        `/admin/product/${id}`,
        `/products/${id}`,
        `/product/${id}`,
        `/api/admin/products/${id}`,
        `/api/products/${id}`,
        `/v1/products/${id}`,
      ];

      // list endpoints (search inside)
      const lists = [
        `/admin/products`,
        `/products`,
        `/api/products`,
        `/v1/products`,
      ];

      console.log("[AdminEdit] Trying single endpoints:", singles);
      for (const ep of singles) {
        const r = await tryGet(ep);
        console.log("[AdminEdit] tried", ep, r.ok ? "OK" : `FAILED ${r.status || ""}`, r.ok ? r.data : r.data || r.err);
        if (r.ok && r.data) {
          const p = normalizeProduct(r.data);
          if (p) {
            console.log("[AdminEdit] Using product from", ep, p);
            fillFromProduct(p);
            setLoading(false);
            return;
          }
        }
      }

      console.log("[AdminEdit] Trying list endpoints:", lists);
      for (const le of lists) {
        const r = await tryGet(le);
        console.log("[AdminEdit] tried list", le, r.ok ? "OK" : `FAILED ${r.status || ""}`, r.ok ? r.data : r.data || r.err);
        if (r.ok && r.data) {
          let list = r.data;
          if (!Array.isArray(list)) {
            list = r.data?.products ?? r.data?.data ?? r.data?.result ?? r.data?.items ?? list;
          }
          if (Array.isArray(list)) {
            const found = list.find(p => String(p._id ?? p.id ?? p._doc?._id ?? "") === String(id));
            if (found) {
              const p = normalizeProduct(found) ?? found;
              console.log("[AdminEdit] Found product inside list", le, p);
              fillFromProduct(p);
              setLoading(false);
              return;
            }
          } else {
            console.log("[AdminEdit] list endpoint returned non-array:", le, r.data);
          }
        }
      }

      console.error("[AdminEdit] Could not find product via any endpoint tried. Check server routes or axios baseURL.");
      setLoading(false);
    }

    function fillFromProduct(product) {
      if (!product) return;
      setTitle(product?.title ?? product?.name ?? "");
      setSlug(product?.slug ?? "");
      setPrice(product?.price ?? "");
      setMrp(product?.mrp ?? "");
      setStock(product?.stock ?? product?.quantity ?? "");
      setSku(product?.sku ?? "");
      setBrand(product?.brand ?? "");
      setCategory(product?.category ?? product?.cat ?? "");
      setVideoUrl(product?.videoUrl ?? product?.video ?? "");
      const colors = product?.colors ?? product?.colours ?? [];
      setColorsText(Array.isArray(colors) ? arrayToString(colors) : String(colors ?? ""));
      const sizes = product?.sizes ?? product?.size ?? [];
      setSizesText(Array.isArray(sizes) ? arrayToString(sizes) : String(sizes ?? ""));
      setDescription(product?.description ?? "");
      setPublished(Boolean(product?.published));
      setExistingImages(normalizeImgs(product));
    }

    fetchAggressive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // previews for newly chosen files
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
        if (previews.filter(Boolean).length === newFiles.length) setNewPreviews(previews);
      };
      reader.readAsDataURL(file);
    });
  }, [newFiles]);

  function handleFileChange(e) {
    setNewFiles(Array.from(e.target.files || []));
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

  // Save — correct update endpoint (admin)
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
      images: existingImages.map(i => i.raw ?? i.url)
    };

    console.log("[AdminEdit] saving payload:", payload);

    try {
      await axiosInstance.put(`/admin/products/${id}`, payload);
      navigate("/admin/products");
    } catch (err) {
      console.error("[AdminEdit] Save failed:", err, err?.response?.data ?? "");
      alert("Save failed — check console & network tab.");
    }
  }

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div className="admin-edit-wrap">
      <h1>Edit product — {title || ""}</h1>
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
          <div className="images-section">
            <h4>Existing images</h4>
            <div className="images-grid">
              {existingImages.length === 0 && <div>No existing images</div>}
              {existingImages.map((img, idx) => (
                <div className="image-card" key={idx}>
                  <img src={img.url || "/placeholder.png"} alt={`img-${idx}`} onError={(e)=>{e.target.src="/placeholder.png";}} />
                  <button type="button" onClick={() => removeExistingImage(idx)}>×</button>
                </div>
              ))}
            </div>

            <h4>Add new images</h4>
            <input type="file" multiple accept="image/*" onChange={handleFileChange} />
            <div className="images-grid">
              {newPreviews.map((p, idx) => (
                <div className="image-card" key={idx}>
                  <img src={p} alt={`preview-${idx}`} />
                  <button type="button" onClick={() => removeNewPreview(idx)}>×</button>
                </div>
              ))}
            </div>
          </div>

          <label>Colors (comma-separated)<input value={colorsText} onChange={e => setColorsText(e.target.value)} placeholder="e.g. red, blue" /></label>
          <div className="color-swatches">
            {stringToArray(colorsText).map((c, i) => (
              <div className="swatch-item" key={i}>
                <div className="swatch" style={{ backgroundColor: c }} title={c} />
                <span>{c}</span>
              </div>
            ))}
          </div>

          <label>Sizes (comma-separated)<input value={sizesText} onChange={e => setSizesText(e.target.value)} placeholder="e.g. S, M, L" /></label>
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
