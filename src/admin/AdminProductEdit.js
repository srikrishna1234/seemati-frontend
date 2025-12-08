// src/admin/AdminProductEdit.js
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';

/*
 Full replacement preserving your features:
 - color picker, video preview, auto-slug, auto-sku, images upload, keepMap, etc.
 - Adds fallback for GET product
 - On upload, tries multiple candidate endpoints (PUT/POST) until one accepts the files
 - On save, tries multiple candidate update endpoints until one succeeds
*/

const NAMED_COLORS = {
  white: '#FFFFFF', silver: '#C0C0C0', gray: '#808080', black: '#000000',
  red: '#FF0000', maroon: '#800000', yellow: '#FFFF00', olive: '#808000',
  lime: '#00FF00', green: '#008000', aqua: '#00FFFF', teal: '#008080',
  blue: '#0000FF', navy: '#000080', fuchsia: '#FF00FF', purple: '#800080',
  pink: '#FFC0CB', brown: '#A52A2A', orange: '#FFA500', gold: '#FFD700',
  peach: '#FFDAB9', mustard: '#FFDB58', coral: '#FF7F50'
};

function hexToRgb(hex) {
  if (!hex) return { r: 0, g: 0, b: 0 };
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16)
    };
  }
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16)
  };
}
function nearestColorName(hex) {
  try {
    const src = hexToRgb(hex);
    let best = null;
    let bestDist = Infinity;
    Object.entries(NAMED_COLORS).forEach(([name, h]) => {
      const t = hexToRgb(h);
      const dx = src.r - t.r, dy = src.g - t.g, dz = src.b - t.b;
      const dist = dx * dx + dy * dy + dz * dz;
      if (dist < bestDist) { bestDist = dist; best = name; }
    });
    return best || '';
  } catch { return ''; }
}

function makeSlug(text) {
  if (!text) return "";
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function sanitizeAlnum(s = "") {
  return String(s || "").replace(/[^a-z0-9]/gi, "").toUpperCase();
}
function generateSku({ brand, category, title }) {
  const b = sanitizeAlnum(brand || "");
  const c = sanitizeAlnum(category || "");
  let prefix = "KPL";
  if (b && c) {
    const pb = b.slice(0, 3);
    const pc = c.slice(0, 3);
    prefix = `${pb}-${pc}`;
  } else if (b) {
    prefix = `${b.slice(0, 3)}`;
  } else if (c) {
    prefix = `${c.slice(0, 3)}`;
  } else if (title) {
    prefix = sanitizeAlnum(title).slice(0, 3) || "KPL";
  }
  const counter = String(Math.abs(Date.now()) % 1000).padStart(3, "0");
  return `${prefix}-${counter}`;
}

export default function AdminProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const colorPickerRef = useRef(null);
  const [colorPickerIndex, setColorPickerIndex] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState({
    title: '', slug: '', price: '', mrp: '', stock: '', sku: '',
    brand: '', category: '', videoUrl: '', colors: '', sizes: '',
    description: '', isPublished: false
  });

  const [slugEdited, setSlugEdited] = useState(false);
  const [skuEdited, setSkuEdited] = useState(false);

  const [existingImages, setExistingImages] = useState([]);
  const [keepMap, setKeepMap] = useState({});
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [swatches, setSwatches] = useState([]);

  const parseColorsInputToArray = (text) => {
    if (!text) return [];
    return text.split(',').map(s => s.trim()).filter(Boolean);
  };
  const normalizeToHexIfPossible = (col) => {
    if (!col) return '';
    const t = col.trim();
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(t)) {
      const clean = t.replace('#', '');
      const full = clean.length === 3 ? clean[0]+clean[0]+clean[1]+clean[1]+clean[2]+clean[2] : clean;
      return `#${full.toUpperCase()}`;
    }
    const lower = t.toLowerCase();
    if (NAMED_COLORS[lower]) return NAMED_COLORS[lower].toUpperCase();
    return t;
  };

  useEffect(() => {
    let cancelled = false;
    if (!id) {
      setLoading(false);
      setExistingImages([]);
      setKeepMap({});
      setSwatches([]);
      setProduct(prev => {
        const seeded = { ...prev };
        if (!seeded.slug && seeded.title) seeded.slug = makeSlug(seeded.title);
        if (!seeded.sku) seeded.sku = generateSku({ brand: seeded.brand, category: seeded.category, title: seeded.title });
        return seeded;
      });
      return () => { cancelled = true; };
    }

    async function load() {
      try {
        setLoading(true);
        try {
          const resp = await axiosInstance.get(`/api/products/${id}`);
          if (resp && resp.data) {
            const p = resp.data.product || (resp.data.success && resp.data.products && resp.data.products[0]) || resp.data;
            if (p && typeof p === 'object') {
              populateFromProduct(p);
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          console.warn('Direct GET failed, falling back to list', err && err.response ? err.response.status : err.message);
        }

        try {
          const listResp = await axiosInstance.get('/api/products');
          const products = (listResp && listResp.data && (listResp.data.products || listResp.data)) || [];
          if (Array.isArray(products) && products.length) {
            let found = products.find(p => String(p._id) === String(id));
            if (!found) found = products.find(p => p.slug === id || String(p.slug) === String(id));
            if (found) { populateFromProduct(found); setLoading(false); return; }
          }
          alert('Product not found on server.');
        } catch (err) {
          console.error('Products list fallback failed', err);
          alert('Failed to load product list fallback. See console.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    function populateFromProduct(p) {
      setProduct({
        title: p.title || '', slug: p.slug || '', price: p.price || '', mrp: p.mrp || '',
        stock: p.stock || '', sku: p.sku || '', brand: p.brand || '', category: p.category || '',
        videoUrl: p.videoUrl || '', colors: Array.isArray(p.colors) ? p.colors.join(', ') : (p.colors || ''),
        sizes: Array.isArray(p.sizes) ? p.sizes.join(', ') : (p.sizes || ''), description: p.description || '',
        isPublished: !!p.isPublished
      });
      if (p.slug) setSlugEdited(true);
      if (p.sku) setSkuEdited(true);
      const imgs = Array.isArray(p.images) ? p.images.map(it => (typeof it === 'string' ? it : (it.url || it))) : [];
      setExistingImages(imgs);
      const map = {}; imgs.forEach(url => (map[url] = true)); setKeepMap(map);
      const parsed = Array.isArray(p.colors) ? p.colors : (p.colors ? p.colors.split(',').map(s => s.trim()) : []);
      const normalized = parsed.map((c) => normalizeToHexIfPossible(c));
      setSwatches(normalized);
    }

    load();
    return () => { cancelled = true; selectedFiles.forEach(s => s.previewUrl && URL.revokeObjectURL(s.previewUrl)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const mapped = swatches.map((s) => {
      if (!s) return '';
      const found = Object.entries(NAMED_COLORS).find(([, v]) => v.toUpperCase() === s.toUpperCase());
      if (found) return found[0].toUpperCase();
      return s;
    }).filter(Boolean).join(', ');
    setProduct(prev => ({ ...prev, colors: mapped }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swatches]);

  useEffect(() => {
    if (!slugEdited) {
      setProduct(prev => ({ ...prev, slug: makeSlug(prev.title || "") }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.title, slugEdited]);

  useEffect(() => {
    if (!skuEdited) {
      const s = generateSku({ brand: product.brand, category: product.category, title: product.title });
      setProduct(prev => ({ ...prev, sku: s }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.brand, product.category, product.title, skuEdited]);

  function handleChange(e) {
    const { name, value, checked } = e.target;
    if (name === 'isPublished') setProduct(prev => ({ ...prev, isPublished: !!checked }));
    else {
      if (name === 'slug') setSlugEdited(true);
      if (name === 'sku') setSkuEdited(true);
      setProduct(prev => ({ ...prev, [name]: value }));
      if (name === 'colors') {
        const arr = parseColorsInputToArray(value).map(c => normalizeToHexIfPossible(c));
        setSwatches(arr);
      }
    }
  }

  function onFilesSelected(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newSelected = files.map(f => ({ file: f, previewUrl: URL.createObjectURL(f) }));
    setSelectedFiles(prev => [...prev, ...newSelected]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }
  function removeSelectedPreview(index) {
    setSelectedFiles(prev => {
      const copy = [...prev];
      const removed = copy.splice(index, 1)[0];
      if (removed && removed.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return copy;
    });
  }
  function toggleKeep(url) { setKeepMap(prev => ({ ...prev, [url]: !prev[url] })); }

  function handleGenerateSku() {
    const newSku = generateSku({ brand: product.brand, category: product.category, title: product.title });
    setProduct(prev => ({ ...prev, sku: newSku }));
    setSkuEdited(true);
  }

  // --- Robust uploadFilesToProduct: tries multiple candidate endpoints for uploading files ---
   // --- Upload files for this product: always hit the S3-enabled upload route ---
   // --- Robust uploadFilesToProduct: tries multiple candidate endpoints for uploading files ---
  async function uploadFilesToProduct(pId) {
  if (!selectedFiles.length) return [];
  if (!pId) throw new Error("Missing product id for upload");

  const formData = new FormData();
  selectedFiles.forEach(s => formData.append("images", s.file));

  // ---- FINAL, CORRECT ENDPOINTS ----
  const candidates = [
    { method: "put",  url: `/api/uploadRoutes/${pId}/upload` },
    { method: "post", url: `/api/uploadRoutes/upload` }
  ];

  let lastErr = null;

  for (const c of candidates) {
    try {
      let resp;
      if (c.method === "put") {
        resp = await axiosInstance.put(c.url, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      } else {
        resp = await axiosInstance.post(c.url, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      }

      const data = resp.data || {};
      const array =
        (Array.isArray(data.uploaded) && data.uploaded) ||
        (data.url ? [{ url: data.url }] : []);

      return array.map(f => f.url);
    } catch (err) {
      lastErr = err;
      console.warn(`UPLOAD FAIL @ ${c.url}`, err?.response?.status);
    }
  }

  throw new Error(
    lastErr?.response?.data?.error ||
      lastErr?.message ||
      "Upload failed"
  );
}


  async function createMinimalProduct(body) {
    const payload = {
      title: body.title || 'Untitled product',
      slug: body.slug || '',
      price: Number(body.price) || 0,
      mrp: Number(body.mrp) || 0,
      stock: Number(body.stock) || 0,
      sku: body.sku || '',
      brand: body.brand || '',
      category: body.category || '',
      videoUrl: body.videoUrl || '',
      description: body.description || '',
      isPublished: !!body.isPublished,
      colors: body.colors || [],
      sizes: body.sizes || [],
      images: []
    };
    const res = await axiosInstance.post('/api/products', payload);
    const created = res && res.data ? (res.data.product || res.data) : null;
    if (!created) throw new Error('Create product failed: no product returned');
    return created;
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);

    try {
      const bodyForProduct = {
        title: product.title,
        slug: product.slug,
        price: Number(product.price) || 0,
        mrp: Number(product.mrp) || 0,
        stock: Number(product.stock) || 0,
        sku: product.sku,
        brand: product.brand,
        category: product.category,
        videoUrl: product.videoUrl,
        description: product.description,
        isPublished: !!product.isPublished,
        colors: swatches.map(s => s),
        sizes: product.sizes ? product.sizes.split(',').map(s => s.trim()).filter(Boolean) : []
      };

      let targetId = id;

      if (!targetId) {
        if (!bodyForProduct.slug) bodyForProduct.slug = makeSlug(bodyForProduct.title || "");
        if (!bodyForProduct.sku) bodyForProduct.sku = generateSku({ brand: bodyForProduct.brand, category: bodyForProduct.category, title: bodyForProduct.title });
        const created = await createMinimalProduct(bodyForProduct);
        targetId = created._id || created.id || (created._id && created._id.toString());
        if (!targetId) throw new Error('Could not obtain new product id from create response');
        setProduct(prev => ({ ...prev, slug: created.slug || prev.slug, sku: created.sku || prev.sku }));
      }

      // Try upload first if files selected
      let uploadedUrls = [];
      if (selectedFiles.length) {
        try {
          uploadedUrls = await uploadFilesToProduct(targetId);
        } catch (err) {
          console.error('Upload request failed', err);
          throw new Error('Upload request failed: ' + (err.message || err));
        }
      }

      const kept = existingImages.filter(u => keepMap[u]);
      const finalImages = [...kept];
      uploadedUrls.forEach(u => { if (!finalImages.includes(u)) finalImages.push(u); });

      const finalBody = { ...bodyForProduct, images: finalImages };

      const triedUrls = [
        { url: `/api/products/${targetId}`, desc: 'public' },
        { url: `/api/admin/product/${targetId}`, desc: 'admin (api/admin/product)' },
        { url: `/api/admin/products/${targetId}`, desc: 'admin (api/admin/products)' },
        { url: `/api/adminProduct/products/${targetId}`, desc: 'adminProduct (api/adminProduct/products)' }
      ];

      let savedResp = null;
      let lastErr = null;
      for (const t of triedUrls) {
        try {
          const resp = await axiosInstance.put(t.url, finalBody);
          if (resp && resp.status >= 200 && resp.status < 300) {
            savedResp = resp;
            break;
          }
        } catch (err) {
          lastErr = err;
          console.warn(`[save] PUT ${t.url} failed`, err && err.response && err.response.status ? err.response.status : err.message);
        }
      }

      if (!savedResp) {
        console.error('All update attempts failed', lastErr);
        const msg = lastErr && lastErr.response && lastErr.response.data && lastErr.response.data.message
          ? lastErr.response.data.message
          : (lastErr && lastErr.message) || 'Save failed on all attempted update endpoints';
        throw new Error(msg);
      }

      selectedFiles.forEach(s => s.previewUrl && URL.revokeObjectURL(s.previewUrl));
      setSelectedFiles([]);
      const updatedProduct = savedResp.data.product || savedResp.data;
      const imgs = Array.isArray(updatedProduct.images) ? updatedProduct.images.map(it => (typeof it === 'string' ? it : (it.url || it))) : [];
      setExistingImages(imgs);
      const map = {}; imgs.forEach(u => (map[u] = true)); setKeepMap(map);
      alert(!id ? 'Product created and saved.' : 'Product updated.');
      if (!id && targetId) navigate(`/admin/products/${targetId}/edit`);
    } catch (err) {
      console.error('Save error', err);
      const msg = (err && err.response && err.response.data && (err.response.data.message || JSON.stringify(err.response.data))) || (err && err.message) || 'Save failed';
      alert(msg);
    } finally {
      setSaving(false);
    }
  }

  function openColorPickerAtIndex(idx) {
    setColorPickerIndex(idx);
    if (colorPickerRef.current) {
      const cur = swatches[idx] || '#FFFFFF';
      const normalized = normalizeToHexIfPossible(cur) || '#FFFFFF';
      colorPickerRef.current.value = normalized;
      colorPickerRef.current.click();
    }
  }
  function onColorPickerChange(e) {
    const val = e.target.value;
    const idx = colorPickerIndex;
    setColorPickerIndex(null);
    if (idx == null) return;
    setSwatches(prev => { const copy = [...prev]; copy[idx] = val.toUpperCase(); return copy; });
  }
  function addSwatch() { setSwatches(prev => [...prev, '#FFFFFF']); }
  function removeSwatch(i) { setSwatches(prev => prev.filter((_, idx) => idx !== i)); }

  function getYouTubeEmbedUrl(raw) {
    if (!raw) return null;
    try {
      const u = raw.trim();
      const vMatch = u.match(/[?&]v=([^&]+)/);
      if (vMatch) return `https://www.youtube.com/embed/${vMatch[1]}`;
      const short = u.match(/youtu\.be\/([^?&]+)/);
      if (short) return `https://www.youtube.com/embed/${short[1]}`;
      if (u.includes('youtube.com/embed/')) return u;
      return null;
    } catch { return null; }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ display: 'flex', gap: 40, padding: 12 }}>
      <form onSubmit={handleSave} style={{ width: '40%' }}>
        <div style={{ marginBottom: 10 }}>
          <button type="button" onClick={() => navigate('/admin/products')}>Back to products</button>
        </div>

        <div><label>Title</label><br />
          <input name="title" value={product.title} onChange={handleChange} style={{ width: '100%' }} /></div>

        <div><label>Slug</label><br />
          <input
            name="slug"
            value={product.slug}
            onChange={(e) => { handleChange(e); setSlugEdited(true); }}
            style={{ width: '100%' }} /></div>

        <div><label>Price</label><br />
          <input name="price" value={product.price} onChange={handleChange} style={{ width: '100%' }} /></div>

        <div><label>MRP</label><br />
          <input name="mrp" value={product.mrp} onChange={handleChange} style={{ width: '100%' }} /></div>

        <div><label>Stock</label><br />
          <input name="stock" value={product.stock} onChange={handleChange} style={{ width: '100%' }} /></div>

        <div><label>SKU</label><br />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              name="sku"
              value={product.sku}
              onChange={(e) => { handleChange(e); setSkuEdited(true); }}
              style={{ width: '100%' }} />
            <button type="button" onClick={handleGenerateSku}>Generate SKU</button>
          </div>
          <div style={{ fontSize: 12, color: '#555', marginTop: 6 }}>
            Format: BRAND-CTG-XXX or fallback KPL-XXX (XXX = 3-digit counter)
          </div>
        </div>

        <div><label>Brand</label><br />
          <input name="brand" value={product.brand} onChange={handleChange} style={{ width: '100%' }} /></div>

        <div><label>Category</label><br />
          <input name="category" value={product.category} onChange={handleChange} style={{ width: '100%' }} /></div>

        <div><label>Video URL (YouTube)</label><br />
          <input name="videoUrl" value={product.videoUrl} onChange={handleChange} style={{ width: '100%' }} />
          <div style={{ fontSize: 12, marginTop: 6, color: '#555' }}>
            Paste YouTube link (example: https://youtu.be/VIDEOID or https://www.youtube.com/watch?v=VIDEOID)
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Colors (comma-separated)</label><br />
          <input name="colors" value={product.colors} onChange={handleChange} style={{ width: '100%' }} />
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }}>
            {swatches.map((c, i) => {
              const isHex = /^#([0-9A-F]{6})$/i.test(String(c).trim());
              const bg = isHex ? c : '#EEE';
              const suggestedName = isHex ? nearestColorName(c) : (String(c) || '');
              return (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div title={String(c)} onClick={() => openColorPickerAtIndex(i)}
                    style={{ width: 48, height: 48, borderRadius: 6, border: '1px solid #ccc', boxShadow: '0 1px 6px rgba(0,0,0,0.12)', background: bg, cursor: 'pointer' }} />
                  <div style={{ fontSize: 12, marginTop: 6, maxWidth: 80, wordBreak: 'break-word' }}>{suggestedName || String(c).slice(0, 12)}</div>
                  <div style={{ marginTop: 6 }}><button type="button" onClick={() => removeSwatch(i)}>Remove</button></div>
                </div>
              );
            })}
            <div><button type="button" onClick={addSwatch}>+ Add color</button></div>
            <input ref={colorPickerRef} type="color" style={{ display: 'none' }} onChange={onColorPickerChange} aria-hidden="true" />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Sizes (comma-separated)</label><br />
          <input name="sizes" value={product.sizes} onChange={handleChange} style={{ width: '100%' }} />
        </div>

        <div><label>Description</label><br />
          <textarea name="description" value={product.description} onChange={handleChange} rows={6} style={{ width: '100%' }} /></div>

        <div>
          <label><input name="isPublished" type="checkbox" checked={product.isPublished} onChange={handleChange} /> Published</label>
        </div>

        <div style={{ marginTop: 8 }}>
          <button type="submit" disabled={saving}>{saving ? 'Saving...' : (!id ? 'Create product' : 'Save')}</button>
          <button type="button" onClick={() => navigate('/admin/products')}>Cancel</button>
        </div>
      </form>

      <div style={{ width: '50%' }}>
        <h3>Existing Images</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {existingImages.map((url, idx) => (
            <div key={url} style={{ textAlign: 'center', width: 120 }}>
              <img src={url} alt={`img-${idx}`} style={{ width: 100, height: 100, objectFit: 'cover' }} />
              <div><label><input type="checkbox" checked={!!keepMap[url]} onChange={() => toggleKeep(url)} /> Keep</label></div>
              <div><button type="button" onClick={() => { setKeepMap(prev => ({ ...prev, [url]: false })); }}>Remove</button></div>
            </div>
          ))}
          {existingImages.length === 0 && <div>No existing images</div>}
        </div>

        <h3 style={{ marginTop: 16 }}>Add Images</h3>
        <input ref={fileInputRef} type="file" multiple onChange={onFilesSelected} />
        <div style={{ marginTop: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {selectedFiles.map((s, i) => (
            <div key={s.previewUrl + i} style={{ textAlign: 'center', width: 120 }}>
              <img src={s.previewUrl} alt={`preview-${i}`} style={{ width: 100, height: 100, objectFit: 'cover' }} />
              <div><button type="button" onClick={() => removeSelectedPreview(i)}>Remove</button></div>
            </div>
          ))}
          {selectedFiles.length === 0 && <div>No files chosen</div>}
        </div>

        <div style={{ marginTop: 20 }}>
          <h4>Video preview</h4>
          {product.videoUrl ? (() => {
            const embed = getYouTubeEmbedUrl(product.videoUrl);
            if (embed) {
              return <div style={{ width: '100%', height: 250 }}><iframe title="video-preview" src={embed} style={{ width: '100%', height: '100%', border: 'none' }} allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div>;
            }
            return <div>Unsupported video URL (currently only YouTube links are previewed).</div>;
          })() : (<div>No video URL provided</div>)}
        </div>
      </div>
    </div>
  );
}
