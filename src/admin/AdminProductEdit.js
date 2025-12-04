// src/admin/AdminProductEdit.js
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';

/*
 AdminProductEdit:
 - works as edit when :id param exists
 - when used for "Add" (no id param) it will create a product first,
   upload files to the new product id, then update the product images etc.

 Notes:
 - This file preserves your original UI and logic but:
   * uses backend endpoints without the extra "/api" prefix (calls /products and /products/:id)
   * is defensive about response shapes (handles resp.data.product or resp.data)
   * after creating a new product it navigates to /admin/products/{id} (so the edit page opens)
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

// slug helper
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

// sku helper
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
  const { id } = useParams(); // may be undefined for "add"
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

  // flags to track manual edits so we don't override
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

    // If no id (we are in "Add"), don't fetch; just initialize.
    if (!id) {
      setLoading(false);
      setExistingImages([]);
      setKeepMap({});
      setSwatches([]);
      // try to seed defaults (sku/slug) based on empty product state (no manual edits)
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
        console.debug('[AdminProductEdit] fetching product', id);
        // <-- Use /products/:id (backend exposes public products endpoints without /api)
        const resp = await axiosInstance.get(`/products/${id}`);
        if (cancelled) return;
        const data = resp && resp.data ? (resp.data.product || resp.data) : null;

        if (data) {
          const p = data;
          setProduct({
            title: p.title || '', slug: p.slug || '', price: p.price || '', mrp: p.mrp || '',
            stock: p.stock || '', sku: p.sku || '', brand: p.brand || '', category: p.category || '',
            videoUrl: p.videoUrl || '', colors: Array.isArray(p.colors) ? p.colors.join(', ') : (p.colors || ''),
            sizes: Array.isArray(p.sizes) ? p.sizes.join(', ') : (p.sizes || ''), description: p.description || '',
            isPublished: !!p.isPublished
          });

          // if slug or sku exist in product we treat them as manually set (don't overwrite)
          if (p.slug) setSlugEdited(true);
          if (p.sku) setSkuEdited(true);

          const imgs = Array.isArray(p.images) ? p.images.map(it => (typeof it === 'string' ? it : (it.url || it))) : [];
          setExistingImages(imgs);
          const map = {}; imgs.forEach(url => (map[url] = true)); setKeepMap(map);

          const parsed = Array.isArray(p.colors) ? p.colors : (p.colors ? p.colors.split(',').map(s => s.trim()) : []);
          const normalized = parsed.map((c) => normalizeToHexIfPossible(c));
          setSwatches(normalized);
        } else {
          // be explicit when nothing returned
          console.warn('[AdminProductEdit] no product data returned for id', id, resp && resp.data);
          alert('Failed to load product (no data returned). See console for details.');
        }
      } catch (err) {
        console.error('Failed to fetch product', err);
        alert('Error loading product. See console.');
      } finally {
        if (!cancelled) setLoading(false);
      }
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

  // Auto-generate slug from title when title changes unless slugEdited
  useEffect(() => {
    if (!slugEdited) {
      setProduct(prev => ({ ...prev, slug: makeSlug(prev.title || "") }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.title, slugEdited]);

  // Auto-generate sku when brand/category/title change unless skuEdited
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
      // If user edits slug or sku manually, mark them edited so auto-generation stops
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

  // Generate SKU on demand (button)
  function handleGenerateSku() {
    const newSku = generateSku({ brand: product.brand, category: product.category, title: product.title });
    setProduct(prev => ({ ...prev, sku: newSku }));
    setSkuEdited(true); // treat as manual choice so auto effects won't overwrite
  }

  // Uploads files to /products/{pId}/upload — returns array of uploaded URLs
  async function uploadFilesToProduct(pId) {
    if (!selectedFiles.length) return [];
    if (!pId) throw new Error('Missing product id for upload');
    const formData = new FormData();
    selectedFiles.forEach(s => formData.append('files', s.file));
    // Use /products/:id/upload (no /api prefix)
    const resp = await axiosInstance.put(`/products/${pId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    const data = resp && resp.data ? resp.data : {};
    let uploadedArray = [];
    if (Array.isArray(data.uploaded) && data.uploaded.length) uploadedArray = data.uploaded;
    else if (data.key && data.url) uploadedArray = [{ key: data.key, url: data.url }];
    else if (Array.isArray(data)) uploadedArray = data;
    const urls = uploadedArray.map(u => (u && u.url) ? u.url : (typeof u === 'string' ? u : null)).filter(Boolean);
    return urls;
  }

  // Create minimal product (used when id is missing) and return created product object
  async function createMinimalProduct(body) {
    // Keep fields minimal but include necessary ones so server creates a doc and returns an _id
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
      images: [] // will update after upload
    };
    // POST to /products (no /api)
    const res = await axiosInstance.post('/products', payload);
    const created = res && res.data ? (res.data.product || res.data) : null;
    if (!created) throw new Error('Create product failed: no product returned');
    return created;
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);

    try {
      // Convert sizes/colors to arrays for request
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

      let targetId = id; // if editing, use existing id

      // If no id present, create a minimal product first
      if (!targetId) {
        // Ensure we have a slug & sku before creating (if not manual, auto-generate here too)
        if (!bodyForProduct.slug) bodyForProduct.slug = makeSlug(bodyForProduct.title || "");
        if (!bodyForProduct.sku) bodyForProduct.sku = generateSku({ brand: bodyForProduct.brand, category: bodyForProduct.category, title: bodyForProduct.title });

        const created = await createMinimalProduct(bodyForProduct);
        targetId = created._id || created.id || (created && created._doc && created._doc._id) || null;
        if (!targetId) throw new Error('Could not obtain new product id from create response');
        // set local state product to include returned values
        setProduct(prev => ({ ...prev, slug: created.slug || prev.slug, sku: created.sku || prev.sku }));
      }

      // If selected files exist, upload them to the product upload endpoint
      let uploadedUrls = [];
      if (selectedFiles.length) {
        try {
          uploadedUrls = await uploadFilesToProduct(targetId);
          if (!uploadedUrls.length) console.warn('Upload returned no URLs');
        } catch (err) {
          console.error('Upload failed', err);
          throw new Error('Upload request failed: ' + (err.message || err));
        }
      }

      // Build final images list: keep existing ones (kept by keepMap) + uploaded
      const kept = existingImages.filter(u => keepMap[u]);
      const finalImages = [...kept];
      uploadedUrls.forEach(u => { if (!finalImages.includes(u)) finalImages.push(u); });

      // Now update product with full fields (images included)
      const finalBody = {
        ...bodyForProduct,
        images: finalImages
      };

      // Use PUT to /products/:id (no /api prefix)
      const resp = await axiosInstance.put(`/products/${targetId}`, finalBody);
      const respData = resp && resp.data ? (resp.data.product || resp.data) : null;
      const ok = resp && (resp.status === 200 || resp.status === 201) || (respData && (respData._id || respData.id));
      if (!ok) {
        console.error('Save failed', resp);
        alert('Save failed. Check server response (console).');
      } else {
        // cleanup previews
        selectedFiles.forEach(s => s.previewUrl && URL.revokeObjectURL(s.previewUrl));
        setSelectedFiles([]);
        // update existing images UI
        const updatedProduct = respData || (resp.data && resp.data.product) || resp.data;
        const imgs = Array.isArray(updatedProduct?.images) ? updatedProduct.images.map(it => (typeof it === 'string' ? it : (it.url || it))) : (Array.isArray(finalImages) ? finalImages : []);
        setExistingImages(imgs);
        const map = {}; imgs.forEach(u => (map[u] = true)); setKeepMap(map);
        alert(!id ? 'Product created and saved.' : 'Product updated.');
        // If we created a new product, navigate to its edit page (so the URL contains the new id)
        if (!id && targetId) {
          // navigate to /admin/products/:id (no extra /edit suffix)
          navigate(`/admin/products/${targetId}`, { replace: true });
        }
      }
    } catch (err) {
      console.error('Save error', err);
      alert(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  // Color picker interactions
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

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div style={{ display: 'flex', gap: 40, padding: 12 }}>
      <form onSubmit={handleSave} style={{ width: '40%' }}>
        <div style={{ marginBottom: 10 }}>
          <button type="button" onClick={() => navigate('/admin/products')}>Back to products</button>
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', fontWeight: 600 }}>Title</label>
          <input name="title" value={product.title} onChange={handleChange} style={{ width: '100%' }} />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', fontWeight: 600 }}>Slug</label>
          <input
            name="slug"
            value={product.slug}
            onChange={(e) => {
              handleChange(e);
              setSlugEdited(true);
            }}
            style={{ width: '100%' }} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontWeight: 600 }}>Price</label>
            <input name="price" value={product.price} onChange={handleChange} style={{ width: '100%' }} />
          </div>
          <div style={{ width: 120 }}>
            <label style={{ display: 'block', fontWeight: 600 }}>MRP</label>
            <input name="mrp" value={product.mrp} onChange={handleChange} style={{ width: '100%' }} />
          </div>
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', fontWeight: 600 }}>Stock</label>
          <input name="stock" value={product.stock} onChange={handleChange} style={{ width: '100%' }} />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', fontWeight: 600 }}>SKU</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              name="sku"
              value={product.sku}
              onChange={(e) => {
                handleChange(e);
                setSkuEdited(true);
              }}
              style={{ width: '100%' }} />
            <button type="button" onClick={handleGenerateSku}>Generate SKU</button>
          </div>
          <div style={{ fontSize: 12, color: '#555', marginTop: 6 }}>
            Format: BRAND-CTG-XXX or fallback KPL-XXX (XXX = 3-digit counter)
          </div>
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', fontWeight: 600 }}>Brand</label>
          <input name="brand" value={product.brand} onChange={handleChange} style={{ width: '100%' }} />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', fontWeight: 600 }}>Category</label>
          <input name="category" value={product.category} onChange={handleChange} style={{ width: '100%' }} />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', fontWeight: 600 }}>Video URL (YouTube)</label>
          <input name="videoUrl" value={product.videoUrl} onChange={handleChange} style={{ width: '100%' }} />
          <div style={{ fontSize: 12, marginTop: 6, color: '#555' }}>
            Paste YouTube link (example: https://youtu.be/VIDEOID or https://www.youtube.com/watch?v=VIDEOID)
          </div>
        </div>

        <div style={{ marginTop: 12, marginBottom: 8 }}>
          <label style={{ display: 'block', fontWeight: 600 }}>Colors (comma-separated)</label>
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

        <div style={{ marginTop: 12, marginBottom: 8 }}>
          <label style={{ display: 'block', fontWeight: 600 }}>Sizes (comma-separated)</label>
          <input name="sizes" value={product.sizes} onChange={handleChange} style={{ width: '100%' }} />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', fontWeight: 600 }}>Description</label>
          <textarea name="description" value={product.description} onChange={handleChange} rows={6} style={{ width: '100%' }} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label><input name="isPublished" type="checkbox" checked={product.isPublished} onChange={handleChange} /> Published</label>
        </div>

        <div style={{ marginTop: 8 }}>
          <button type="submit" disabled={saving}>{saving ? 'Saving...' : (!id ? 'Create product' : 'Save')}</button>
          <button type="button" onClick={() => navigate('/admin/products')} style={{ marginLeft: 8 }}>Cancel</button>
        </div>
      </form>

      <div style={{ width: '50%' }}>
        <h3>Existing Images</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {existingImages.map((url, idx) => (
            <div key={url || idx} style={{ textAlign: 'center', width: 120 }}>
              {url ? (
                <img src={url} alt={`img-${idx}`} style={{ width: 100, height: 100, objectFit: 'cover' }} />
              ) : (
                <div style={{ width: 100, height: 100, background: '#f4f4f4' }} />
              )}
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
