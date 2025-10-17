// src/admin/AdminProductEdit.js
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";

const API_PREFIX = "/admin-api"; // admin endpoints root (we post uploads to /admin-api/products/upload)
const UPLOAD_ENDPOINT = `${API_PREFIX}/products/upload`;

/** Try to find an auth token in local/session storage or cookie names */
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
      if (possibleKeys.includes(name) && val) { token = decodeURIComponent(val); break; }
    }
  }
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

/** Return a stable key for an image entry (support string or object) */
function imageKey(img) {
  if (!img) return null;
  if (typeof img === "string") return img; // URL string
  return img._localKey ?? img._id ?? img.id ?? img.filename ?? img.url ?? JSON.stringify(img);
}

/** Resolve an image object/string to a usable absolute URL for <img src> */
function resolveImgUrl(img) {
  if (!img) return null;
  if (typeof img === "string") return img.startsWith("http") ? img : `${window.location.origin}${img}`;
  // object
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

  // selected files for upload + previews
  const [newFiles, setNewFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);

  useEffect(() => {
    if (!id) { setError("No product id provided."); setLoading(false); return; }
    let mounted = true;

    async function fetchProduct() {
      setLoading(true);
      setError(null);
      const endpoints = [
        `${API_PREFIX}/products/${encodeURIComponent(id)}`,
        `/api/products/${encodeURIComponent(id)}`, // fallback
      ];
      let lastErr = null;
      for (const ep of endpoints) {
        try {
          const headers = getAuthHeader();
          const res = await fetch(ep, { credentials: "include", headers });
          const txt = await res.text().catch(() => "");
          if (!res.ok) { lastErr = `Request ${ep} failed: ${res.status} ${txt}`; continue; }
          let data = null;
          try { data = txt ? JSON.parse(txt) : null; } catch (e) { lastErr = `Invalid JSON from ${ep}`; continue; }
          const resolved = data?.product ?? data ?? null;
          if (resolved) {
            if (!mounted) return;
            resolved.images = resolved.images ?? [];
            setProduct(resolved);

            // initialize keepMap so all existing images are kept by default
            const map = {};
            (resolved.images || []).forEach((img) => {
              const key = imageKey(img);
              if (key) map[key] = true;
            });
            setKeepMap(map);

            setLoading(false);
            return;
          } else {
            lastErr = lastErr || `No product in response from ${ep}`;
            continue;
          }
        } catch (err) {
          lastErr = err.message || String(err);
          console.warn("[AdminProductEdit] fetch attempt failed", err);
        }
      }
      if (mounted) { setError(lastErr || "Product not found."); setLoading(false); }
    }

    fetchProduct();
    return () => {
      mounted = false;
      // cleanup preview object URLs
      previewUrls.forEach((u) => {
        try { URL.revokeObjectURL(u); } catch (e) {}
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
      // if no stable key, keep it (avoid accidental deletion)
      if (!key) return true;
      return !!keepMap[key];
    });
  }

  // Save product (PUT)
  async function handleSave(e) {
    e?.preventDefault?.();
    if (!product) return;
    setSaving(true);
    setError(null);

    // payload: include images array (preserve shape — if images are strings keep strings, if objects keep objects)
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

    const endpoints = [
      `${API_PREFIX}/products/${encodeURIComponent(id)}`,
      `/api/products/${encodeURIComponent(id)}`,
    ];

    let lastErr = null;
    for (const ep of endpoints) {
      try {
        const headers = { "Content-Type": "application/json", ...getAuthHeader() };
        const res = await fetch(ep, {
          method: "PUT",
          credentials: "include",
          headers,
          body: JSON.stringify(payload),
        });
        const txt = await res.text().catch(() => "");
        if (!res.ok) {
          lastErr = `PUT ${ep} failed: ${res.status} ${txt}`;
          console.warn(lastErr);
          continue;
        }
        navigate("/admin/products");
        return;
      } catch (err) {
        lastErr = err.message || String(err);
        console.warn("[AdminProductEdit] save attempt failed", err);
      }
    }

    setError(lastErr || "Failed to save product.");
    setSaving(false);
  }

  async function handleDelete() {
    if (!window.confirm("Delete this product?")) return;
    try {
      const headers = getAuthHeader();
      const res = await fetch(`${API_PREFIX}/products/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
        headers,
      });
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

  // File selection: previews & store File objects
  function onFilesSelected(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    // revoke previous previews
    previewUrls.forEach((u) => {
      try { URL.revokeObjectURL(u); } catch (e) {}
    });
    const urls = files.map((f) => URL.createObjectURL(f));
    setNewFiles(files);
    setPreviewUrls(urls);
  }

  // Upload selected files to backend - merges returned objects into product.images
  async function handleUploadFiles() {
    if (!newFiles || newFiles.length === 0) { alert("Select files first"); return; }
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      // append with key 'files' (your server already accepts this)
      newFiles.forEach((f) => fd.append("files", f));
      const headers = getAuthHeader(); // do not set Content-Type so browser sets multipart/form-data boundary
      const res = await fetch(UPLOAD_ENDPOINT, { method: "POST", credentials: "include", headers, body: fd });
      const txt = await res.text().catch(() => "");
      if (!res.ok) throw new Error(`Upload failed: ${res.status} ${txt}`);
      let data = null;
      try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = null; }

      // Normalize server response:
      // - If server returns array of image objects or URLs -> append them
      // - If server returns single object with filename/url -> append it
      if (Array.isArray(data)) {
        setProduct((p) => ({ ...p, images: [...(p.images || []), ...data] }));
        // ensure keepMap true for appended images
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
        // unknown shape — attempt to refetch product to get server state
        await refetchProduct();
      }

      // cleanup previews and input
      previewUrls.forEach((u) => {
        try { URL.revokeObjectURL(u); } catch (e) {}
      });
      setPreviewUrls([]);
      setNewFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("Upload error", err);
      setError(String(err));
    } finally {
      setUploading(false);
    }
  }

  async function refetchProduct() {
    try {
      const headers = getAuthHeader();
      const res = await fetch(`${API_PREFIX}/products/${encodeURIComponent(id)}`, { credentials: "include", headers });
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      const resolved = data?.product ?? data ?? null;
      if (resolved) {
        resolved.images = resolved.images ?? [];
        setProduct(resolved);
        // ensure keepMap contains new keys
        setKeepMap((m) => {
          const copy = { ...m };
          (resolved.images || []).forEach((img) => {
            const k = imageKey(img);
            if (k && !(k in copy)) copy[k] = true;
          });
          return copy;
        });
      }
    } catch (e) { console.warn("refetchProduct failed", e); }
  }

  if (loading) return <div style={{ padding: 20 }}>Loading product…</div>;

  if (error) {
    return (
      <div style={{ padding: 20 }}>
        <div style={{ color: "#b91c1c", marginBottom: 12 }}>Error: {String(error)}</div>
        <div style={{ marginBottom: 12 }}><Link to="/admin/products">Back to products</Link></div>
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

        <div style={{ marginTop: 8 }}><strong>Images</strong></div>

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
