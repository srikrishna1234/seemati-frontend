// File: src/admin/AdminProductEdit.js
// Full replacement: use axios instance (api) for product GET/PUT/DELETE and for uploads

import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api/axiosInstance";

const API_PREFIX = ""; // we'll rely on `api` baseURL for normal product endpoints
const UPLOAD_ENDPOINT = `${process.env.REACT_APP_API_URL || "https://api.seemati.in/api"}/admin-api/products/upload`;

function getAuthHeader() {
  const possibleKeys = ["token", "authToken", "accessToken", "jwt", "userToken"];
  let token = null;
  try {
    for (const k of possibleKeys) {
      token = localStorage.getItem(k) || sessionStorage.getItem(k);
      if (token) break;
    }
  } catch (e) {}
  if (!token && typeof document !== "undefined") {
    const cookies = document.cookie?.split(";").map((c) => c.trim()) || [];
    for (const c of cookies) {
      if (!c) continue;
      const [name, ...rest] = c.split("=");
      const val = rest.join("=");
      if (possibleKeys.includes(name) && val) {
        token = decodeURIComponent(val);
        break;
      }
    }
  }
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

function imageKey(img) {
  if (!img) return null;
  if (typeof img === "string") return img;
  return img._localKey ?? img._id ?? img.id ?? img.filename ?? img.url ?? JSON.stringify(img);
}

function resolveImgUrl(img) {
  if (!img) return null;
  if (typeof img === "string") return img.startsWith("http") ? img : `${window.location.origin}${img}`;
  const url = img.url || img.filename || img.src || null;
  if (!url) return null;
  return url.startsWith("http") ? url : `${window.location.origin}${url}`;
}

export default function AdminProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const [product, setProduct] = useState(null);
  const [keepMap, setKeepMap] = useState({});
  const [newFiles, setNewFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);

  useEffect(() => {
    if (!id) {
      setError("No product id provided.");
      setLoading(false);
      return;
    }
    let mounted = true;

    async function fetchProduct() {
      setLoading(true);
      setError(null);
      try {
        // primary: use axios instance
        const res = await api.get(`/products/${encodeURIComponent(id)}`);
        const data = res?.data;
        const resolved = data?.product ?? data ?? null;
        if (resolved) {
          if (!mounted) return;
          resolved.images = resolved.images ?? [];
          setProduct(resolved);

          const map = {};
          (resolved.images || []).forEach((img) => {
            const key = imageKey(img);
            if (key) map[key] = true;
          });
          setKeepMap(map);
          setLoading(false);
          return;
        }

        // fallback: try absolute URL
        const fallbackUrl = `${process.env.REACT_APP_API_URL || "https://api.seemati.in/api"}/products/${encodeURIComponent(id)}`;
        const r2 = await fetch(fallbackUrl, { credentials: "include" });
        const txt = await r2.text();
        const parsed = txt ? JSON.parse(txt) : null;
        const resolved2 = parsed?.product ?? parsed ?? null;
        if (resolved2) {
          if (!mounted) return;
          resolved2.images = resolved2.images ?? [];
          setProduct(resolved2);
          const map2 = {};
          (resolved2.images || []).forEach((img) => {
            const key = imageKey(img);
            if (key) map2[key] = true;
          });
          setKeepMap(map2);
          setLoading(false);
          return;
        }

        setError("Product not found.");
      } catch (err) {
        console.warn("[AdminProductEdit] fetch failed", err);
        setError(String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchProduct();
    return () => {
      mounted = false;
      previewUrls.forEach((u) => {
        try {
          URL.revokeObjectURL(u);
        } catch (e) {}
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function updateField(field, val) {
    setProduct((p) => ({ ...p, [field]: val }));
  }

  function toggleKeep(image) {
    const key = imageKey(image);
    if (!key) return;
    setKeepMap((m) => ({ ...m, [key]: !m[key] }));
  }

  function getKeptImagesArray() {
    if (!product || !Array.isArray(product.images)) return [];
    return product.images.filter((img) => {
      const key = imageKey(img);
      if (!key) return true;
      return !!keepMap[key];
    });
  }

  async function handleSave(e) {
    e?.preventDefault?.();
    if (!product) return;
    setSaving(true);
    setError(null);

    const payload = {
      title: product.title,
      description: product.description,
      price: Number(product.price || 0),
      mrp: Number(product.mrp || 0),
      stock: typeof product.stock === "number" ? product.stock : Number(product.stock || 0),
      slug: product.slug,
      category: product.category,
      brand: product.brand,
      videoUrl: product.videoUrl ?? "",
      images: getKeptImagesArray(),
    };

    try {
      await api.put(`/products/${encodeURIComponent(id)}`, payload);
      navigate("/admin/products");
      return;
    } catch (err) {
      console.warn("[AdminProductEdit] save via api failed", err);
      // fallback to absolute fetch
    }

    try {
      const fallbackUrl = `${process.env.REACT_APP_API_URL || "https://api.seemati.in/api"}/products/${encodeURIComponent(id)}`;
      const res = await fetch(fallbackUrl, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`PUT failed: ${res.status} ${txt}`);
      }
      navigate("/admin/products");
      return;
    } catch (err) {
      console.error("[AdminProductEdit] save failed (all attempts)", err);
      setError(String(err));
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this product?")) return;
    try {
      await api.delete(`/products/${encodeURIComponent(id)}`);
      navigate("/admin/products");
      return;
    } catch (err) {
      // fallback to fetch
    }

    try {
      const fallbackUrl = `${process.env.REACT_APP_API_URL || "https://api.seemati.in/api"}/products/${encodeURIComponent(id)}`;
      const res = await fetch(fallbackUrl, { method: "DELETE", credentials: "include", headers: getAuthHeader() });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Delete failed: ${res.status} ${txt}`);
      }
      navigate("/admin/products");
    } catch (err) {
      console.error("Delete error", err);
      alert("Delete failed: " + (err.message || err));
    }
  }

  function onFilesSelected(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    previewUrls.forEach((u) => {
      try {
        URL.revokeObjectURL(u);
      } catch (e) {}
    });
    const urls = files.map((f) => URL.createObjectURL(f));
    setNewFiles(files);
    setPreviewUrls(urls);
  }

  async function handleUploadFiles() {
    if (!newFiles || newFiles.length === 0) {
      alert("Select files first");
      return;
    }
    setUploading(true);
    setError(null);

    try {
      const fd = new FormData();
      newFiles.forEach((f) => fd.append("files", f));

      // try axios post first
      try {
        const resp = await api.post("/products/upload", fd, {
          headers: { ...getAuthHeader() },
          withCredentials: true,
        });
        const data = resp?.data;
        await processUploadResponse(data);
        return;
      } catch (e) {
        // fallback to absolute upload endpoint (admin-api path)
        const res = await fetch(UPLOAD_ENDPOINT, { method: "POST", credentials: "include", body: fd, headers: getAuthHeader() });
        const txt = await res.text().catch(() => "");
        if (!res.ok) throw new Error(`Upload failed: ${res.status} ${txt}`);
        let data = null;
        try {
          data = txt ? JSON.parse(txt) : null;
        } catch (e) {
          data = null;
        }
        await processUploadResponse(data);
        return;
      }
    } catch (err) {
      console.error("Upload error", err);
      setError(String(err));
    } finally {
      setUploading(false);
    }
  }

  async function processUploadResponse(data) {
    if (Array.isArray(data)) {
      setProduct((p) => ({ ...p, images: [...(p.images || []), ...data] }));
      setKeepMap((m) => {
        const copy = { ...m };
        data.forEach((img) => {
          const key = imageKey(img);
          if (key) copy[key] = true;
        });
        return copy;
      });
    } else if (data && (data.url || data.filename || data._id || data.id)) {
      setProduct((p) => ({ ...p, images: [...(p.images || []), data] }));
      setKeepMap((m) => ({ ...m, [imageKey(data)]: true }));
    } else {
      await refetchProduct();
    }

    previewUrls.forEach((u) => {
      try {
        URL.revokeObjectURL(u);
      } catch (e) {}
    });
    setPreviewUrls([]);
    setNewFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function refetchProduct() {
    try {
      const res = await api.get(`/products/${encodeURIComponent(id)}`);
      const data = res?.data;
      const resolved = data?.product ?? data ?? null;
      if (resolved) {
        resolved.images = resolved.images ?? [];
        setProduct(resolved);
        setKeepMap((m) => {
          const copy = { ...m };
          (resolved.images || []).forEach((img) => {
            const k = imageKey(img);
            if (k && !(k in copy)) copy[k] = true;
          });
          return copy;
        });
      }
    } catch (e) {
      console.warn("refetchProduct failed", e);
    }
  }

  if (loading) return <div style={{ padding: 20 }}>Loading product…</div>;

  if (error) {
    return (
      <div style={{ padding: 20 }}>
        <div style={{ color: "#b91c1c", marginBottom: 12 }}>Error: {String(error)}</div>
        <div style={{ marginBottom: 12 }}>
          <Link to="/admin/products">Back to products</Link>
        </div>
        <pre style={{ whiteSpace: "pre-wrap", background: "#fafafa", padding: 12, borderRadius: 6 }}>{String(error)}</pre>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ padding: 20 }}>
        <div>No product loaded.</div>
        <Link to="/admin/products">Back to products</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Edit product</h2>

      <form onSubmit={handleSave} style={{ maxWidth: 920 }}>
        <label style={{ display: "block", marginBottom: 8 }}>
          Title
          <input value={product.title || ""} onChange={(e) => updateField("title", e.target.value)} style={{ width: "100%", padding: 8, marginTop: 6 }} />
        </label>

        <label style={{ display: "block", marginBottom: 8 }}>
          Slug
          <input value={product.slug || ""} onChange={(e) => updateField("slug", e.target.value)} style={{ width: "100%", padding: 8, marginTop: 6 }} />
        </label>

        <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
          <label style={{ display: "block", flex: 1 }}>
            Price
            <input type="number" value={product.price ?? 0} onChange={(e) => updateField("price", Number(e.target.value || 0))} style={{ width: "100%", padding: 8, marginTop: 6 }} />
          </label>

          <label style={{ display: "block", width: 200 }}>
            MRP
            <input type="number" value={product.mrp ?? 0} onChange={(e) => updateField("mrp", Number(e.target.value || 0))} style={{ width: "100%", padding: 8, marginTop: 6 }} />
          </label>

          <label style={{ display: "block", width: 160 }}>
            Stock
            <input type="number" value={product.stock ?? 0} onChange={(e) => updateField("stock", Number(e.target.value || 0))} style={{ width: "100%", padding: 8, marginTop: 6 }} />
          </label>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
          <label style={{ display: "block", flex: 1 }}>
            Brand
            <input value={product.brand || ""} onChange={(e) => updateField("brand", e.target.value)} style={{ width: "100%", padding: 8, marginTop: 6 }} />
          </label>

          <label style={{ display: "block", width: 300 }}>
            Category
            <input value={product.category || ""} onChange={(e) => updateField("category", e.target.value)} style={{ width: "100%", padding: 8, marginTop: 6 }} />
          </label>
        </div>

        <label style={{ display: "block", marginBottom: 8 }}>
          Description
          <textarea value={product.description || ""} onChange={(e) => updateField("description", e.target.value)} style={{ width: "100%", padding: 10, marginTop: 6, minHeight: 120 }} />
        </label>

        <label style={{ display: "block", marginBottom: 8 }}>
          Video URL
          <input value={product.videoUrl || ""} onChange={(e) => updateField("videoUrl", e.target.value)} placeholder="https://youtube.com/..." style={{ width: "100%", padding: 8, marginTop: 6 }} />
        </label>

        <div style={{ marginTop: 8 }}>
          <strong>Images</strong>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
          {(product.images || []).map((img) => {
            const key = imageKey(img) ?? Math.random().toString(36).slice(2, 9);
            const imgUrl = resolveImgUrl(img);
            return (
              <div key={key} style={{ width: 140, border: "1px solid #eee", padding: 8, borderRadius: 8, background: "#fff" }}>
                <div style={{ width: "100%", height: 100, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                  {imgUrl ? <img alt={product.title} src={imgUrl} style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <div style={{ color: "#9ca3af" }}>No preview</div>}
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
                  <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input type="checkbox" checked={!!keepMap[imageKey(img)]} onChange={() => toggleKeep(img)} />
                    <span style={{ fontSize: 13 }}>Keep</span>
                  </label>
                  <a href={imgUrl || "#"} target="_blank" rel="noreferrer" style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #e6e6e6", background: "#fff", textDecoration: "none" }}>
                    View
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Upload UI */}
        <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center" }}>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={onFilesSelected} />
          <button type="button" onClick={handleUploadFiles} disabled={uploading || newFiles.length === 0} style={{ padding: "8px 12px", borderRadius: 6, background: "#059669", color: "#fff", border: "none", cursor: "pointer" }}>
            {uploading ? "Uploading…" : `Upload ${newFiles.length > 0 ? `(${newFiles.length})` : ""}`}
          </button>

          {newFiles.length > 0 ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {previewUrls.map((u, i) => (
                <div key={i} style={{ width: 64, height: 64, border: "1px solid #eee", borderRadius: 6, overflow: "hidden" }}>
                  <img src={u} alt={`preview-${i}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ))}
              <button type="button" onClick={() => { previewUrls.forEach((u) => { try { URL.revokeObjectURL(u); } catch (e) {} }); setNewFiles([]); setPreviewUrls([]); if (fileInputRef.current) fileInputRef.current.value = ""; }} style={{ padding: "6px 10px" }}>
                Clear
              </button>
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <button type="submit" disabled={saving} style={{ padding: "8px 12px", background: "#0b5cff", color: "#fff", border: "none", borderRadius: 6 }}>
            {saving ? "Saving…" : "Save"}
          </button>

          <button type="button" onClick={() => navigate("/admin/products")} style={{ padding: "8px 12px", borderRadius: 6 }}>
            Cancel
          </button>

          <button type="button" onClick={handleDelete} style={{ padding: "8px 12px", borderRadius: 6, color: "#dc2626", border: "1px solid #fdecea", background: "#fff" }}>
            Delete
          </button>
        </div>

        {error ? <div style={{ color: "#b91c1c", marginTop: 12 }}>{error}</div> : null}
      </form>
    </div>
  );
}
