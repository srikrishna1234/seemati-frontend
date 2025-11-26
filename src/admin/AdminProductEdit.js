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

  // ---------------- GET product (aggressive, tolerant) ----------------
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
      const lists = [
        `/admin/products`,
        `/products`,
        `/api/products`,
        `/v1/products`,
      ];

      console.log("[AdminEdit] Trying single endpoints:", singles);
      for (const ep of singles) {
        const r = await tryGet(ep);
        console.log("[AdminEdit] tried", ep, r.ok ? "OK" : `FAILED ${r.status || ""}`, r.ok ? r.data : r.data ?? r.err);
        if (r.ok && r.data) {
          const p = normalizeProduct(r.data);
          if (p) {
            fillFromProduct(p);
            setLoading(false);
            return;
          }
        }
      }

      console.log("[AdminEdit] Trying list endpoints:", lists);
      for (const le of lists) {
        const r = await tryGet(le);
        console.log("[AdminEdit] tried list", le, r.ok ? "OK" : `FAILED ${r.status || ""}`, r.ok ? r.data : r.data ?? r.err);
        if (r.ok && r.data) {
          let list = r.data;
          if (!Array.isArray(list)) {
            list = r.data?.products ?? r.data?.data ?? r.data?.result ?? r.data?.items ?? list;
          }
          if (Array.isArray(list)) {
            const found = list.find(p => String(p._id ?? p.id ?? p._doc?._id ?? "") === String(id));
            if (found) {
              const p = normalizeProduct(found) ?? found;
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

  // ---------------- previews for new files ----------------
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
  function removeExistingImage(i) {
    const a = [...existingImages]; a.splice(i, 1); setExistingImages(a);
  }
  function removeNewPreview(i) {
    const a = [...newFiles]; const b = [...newPreviews]; a.splice(i, 1); b.splice(i, 1); setNewFiles(a); setNewPreviews(b);
  }

  // ---------------- tolerant save: try multiple endpoints/methods ----------------
  async function tryRequest(method, url, body) {
    try {
      const res = await axiosInstance.request({ method, url, data: body });
      return { ok: true, url, method, res };
    } catch (err) {
      return { ok: false, url, method, err, status: err?.response?.status, data: err?.response?.data };
    }
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
      images: existingImages.map(i => i.raw ?? i.url),
    };

    console.log("[AdminEdit] Prepared payload:", payload);
    setLoading(true);

    // Candidate save attempts in order of likelihood.
    // We'll try until one succeeds or all fail.
    const attempts = [
      { method: "put", url: `/admin/products/${id}` },            // expected
      { method: "post", url: `/admin/products/${id}` },           // maybe POST instead of PUT
      { method: "post", url: `/admin/products/edit/${id}` },      // some apps use edit path
      { method: "post", url: `/admin/products/update/${id}` },    // alternate
      { method: "put", url: `/products/${id}` },                  // fallback (unlikely)
      { method: "post", url: `/products/${id}` },                 // fallback
      { method: "post", url: `/admin/products` , bodyIdInBody: true }, // POST with id in body
      { method: "put", url: `/api/admin/products/${id}` },        // prefixed api
      { method: "post", url: `/api/admin/products/${id}` },       // prefixed api
    ];

    for (const at of attempts) {
      // allow placing id in body for certain endpoints
      const body = at.bodyIdInBody ? { ...payload, id } : payload;
      console.log(`[AdminEdit] attempting ${at.method.toUpperCase()} ${at.url}`);
      const r = await tryRequest(at.method, at.url, body);
      if (r.ok) {
        console.log("[AdminEdit] Save succeeded with", at.method.toUpperCase(), at.url, r.res && r.res.data);
        setLoading(false);
        // navigate after a short delay to let backend settle
        navigate("/admin/products");
        return;
      } else {
        console.warn("[AdminEdit] attempt failed:", at.method.toUpperCase(), at.url, "status:", r.status, "resp:", r.data ?? r.err);
        // if 405 or 400 or 500, we may stop or continue — continue so we find any working route
      }
    }

    // If we reach here, all attempts failed. Print more context and show user dialog.
    console.error("[AdminEdit] All save attempts failed. See aggregated results above.");
    setLoading(false);
    alert("Save failed (all attempts). Check console and network tab for details. I tried several endpoints and methods.");
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
                <div key={idx} className="image-card">
                  <img src={img.url || "/placeholder.png"} alt={`img-${idx}`} onError={(ev)=>ev.target.src="/placeholder.png"} />
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
