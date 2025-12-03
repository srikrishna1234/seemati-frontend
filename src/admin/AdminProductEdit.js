// src/admin/AdminProductEdit.js
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance'; // adjust if your path is different

/**
 * AdminProductEdit with:
 * - clickable color swatches that open native color picker
 * - nearest-color name suggestion (small built-in list, no external deps)
 * - video preview (YouTube iframe) in the right panel
 *
 * Notes:
 * - Colors are stored/displayed as hex strings in swatches.
 * - The textual "Colors (comma-separated)" input still accepts names or hex values.
 * - When you pick a color with the picker it replaces that color entry and updates the input.
 */

const NAMED_COLORS = {
  white: '#FFFFFF',
  silver: '#C0C0C0',
  gray: '#808080',
  black: '#000000',
  red: '#FF0000',
  maroon: '#800000',
  yellow: '#FFFF00',
  olive: '#808000',
  lime: '#00FF00',
  green: '#008000',
  aqua: '#00FFFF',
  teal: '#008080',
  blue: '#0000FF',
  navy: '#000080',
  fuchsia: '#FF00FF',
  purple: '#800080',
  pink: '#FFC0CB',
  brown: '#A52A2A',
  orange: '#FFA500',
  gold: '#FFD700',
  peach: '#FFDAB9',
  mustard: '#FFDB58',
  coral: '#FF7F50'
};

// Helpers: hex <-> rgb
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
function rgbToHex({ r, g, b }) {
  const h = (n) => ('0' + Number(n).toString(16)).slice(-2);
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}
function nearestColorName(hex) {
  try {
    const src = hexToRgb(hex);
    let best = null;
    let bestDist = Infinity;
    Object.entries(NAMED_COLORS).forEach(([name, h]) => {
      const t = hexToRgb(h);
      const dx = src.r - t.r,
        dy = src.g - t.g,
        dz = src.b - t.b;
      const dist = dx * dx + dy * dy + dz * dz;
      if (dist < bestDist) {
        bestDist = dist;
        best = name;
      }
    });
    return best || '';
  } catch {
    return '';
  }
}

export default function AdminProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const colorPickerRef = useRef(null); // hidden color input for pick action
  const [colorPickerIndex, setColorPickerIndex] = useState(null);

  // Product fields
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState({
    title: '',
    slug: '',
    price: '',
    mrp: '',
    stock: '',
    sku: '',
    brand: '',
    category: '',
    videoUrl: '',
    colors: '',
    sizes: '',
    description: '',
    isPublished: false
  });

  // existingImages: array of URL strings currently saved in DB
  const [existingImages, setExistingImages] = useState([]); // e.g. ['https://...png', ...]
  // keep map for existing images (true = keep, false = remove)
  const [keepMap, setKeepMap] = useState({});

  // previews for newly selected files (File objects + preview URL)
  const [selectedFiles, setSelectedFiles] = useState([]); // [{ file, previewUrl }]

  // derived colors array (hex or names)
  const parseColorsInputToArray = (text) => {
    if (!text) return [];
    return text
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  };

  // normalize a color string to hex where possible (if it's a named color from NAMED_COLORS)
  const normalizeToHexIfPossible = (col) => {
    if (!col) return '';
    const t = col.trim();
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(t)) {
      // produce uppercase 6-digit hex
      const clean = t.replace('#', '');
      const full = clean.length === 3
        ? clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2]
        : clean;
      return `#${full.toUpperCase()}`;
    }
    // try named colors map
    const lower = t.toLowerCase();
    if (NAMED_COLORS[lower]) return NAMED_COLORS[lower].toUpperCase();
    // fallback: return original string (will render as text label)
    return t;
  };

  // Colors state used for swatches (array of normalized values)
  const [swatches, setSwatches] = useState([]);

  useEffect(() => {
    let cancelled = false;

    // Defensive guard: if id is missing, don't attempt to fetch.
    // This prevents accidental calls like /api/products/undefined when the Edit component
    // is mounted on an "add" route or when params aren't available.
    if (!id) {
      // initialize an "empty" edit form to let user create via Add page flow if needed,
      // but here we simply stop loading and keep defaults.
      setLoading(false);
      setExistingImages([]);
      setKeepMap({});
      setSwatches([]);
      return () => { cancelled = true; };
    }

    async function load() {
      try {
        setLoading(true);
        const resp = await axiosInstance.get(`/api/products/${id}`);
        if (cancelled) return;

        if (resp.data && resp.data.product) {
          const p = resp.data.product;
          setProduct({
            title: p.title || '',
            slug: p.slug || '',
            price: p.price || '',
            mrp: p.mrp || '',
            stock: p.stock || '',
            sku: p.sku || '',
            brand: p.brand || '',
            category: p.category || '',
            videoUrl: p.videoUrl || '',
            colors: Array.isArray(p.colors) ? p.colors.join(', ') : (p.colors || ''),
            sizes: Array.isArray(p.sizes) ? p.sizes.join(', ') : (p.sizes || ''),
            description: p.description || '',
            isPublished: !!p.isPublished
          });

          // Normalize images: some responses use arrays of strings, some use objects
          const imgs = Array.isArray(p.images)
            ? p.images.map(it => (typeof it === 'string' ? it : (it.url || it)))
            : [];
          setExistingImages(imgs);

          // mark all existing images to keep by default
          const map = {};
          imgs.forEach(url => (map[url] = true));
          setKeepMap(map);

          // set swatches from product colors
          const parsed = Array.isArray(p.colors)
            ? p.colors
            : (p.colors ? p.colors.split(',').map(s => s.trim()) : []);
          const normalized = parsed.map((c) => normalizeToHexIfPossible(c));
          setSwatches(normalized);
        } else {
          // If backend response doesn't include product, show alert but keep UI stable
          alert('Failed to load product.');
        }
      } catch (err) {
        console.error('Failed to fetch product', err);
        alert('Error loading product. See console.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    // cleanup previews on unmount
    return () => {
      cancelled = true;
      selectedFiles.forEach(s => s.previewUrl && URL.revokeObjectURL(s.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Keep the textual colors input synced to swatches
  useEffect(() => {
    // when swatches change, update product.colors string
    const mapped = swatches
      .map((s) => {
        if (!s) return '';
        // prefer named color if it's a named color
        const lower = s.toLowerCase();
        const found = Object.entries(NAMED_COLORS).find(([, v]) => v.toUpperCase() === s.toUpperCase());
        if (found) return found[0].toUpperCase();
        return s;
      })
      .filter(Boolean)
      .join(', ');
    setProduct(prev => ({ ...prev, colors: mapped }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swatches]);

  // Handle input changes
  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    if (name === 'isPublished') {
      setProduct(prev => ({ ...prev, isPublished: !!checked }));
    } else {
      setProduct(prev => ({ ...prev, [name]: value }));
      if (name === 'colors') {
        // update swatches when user types (onChange)
        const arr = parseColorsInputToArray(value).map(c => normalizeToHexIfPossible(c));
        setSwatches(arr);
      }
    }
  }

  // File selection -> create previews
  function onFilesSelected(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newSelected = files.map(f => ({
      file: f,
      previewUrl: URL.createObjectURL(f)
    }));

    // append to existing selectedFiles
    setSelectedFiles(prev => {
      // release old preview URLs we are removing? we keep prev
      return [...prev, ...newSelected];
    });

    // reset input so the same file can be re-selected if user wants
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // Remove preview (before upload)
  function removeSelectedPreview(index) {
    setSelectedFiles(prev => {
      const copy = [...prev];
      const removed = copy.splice(index, 1)[0];
      if (removed && removed.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return copy;
    });
  }

  // Toggle keep/remove for existing image URL
  function toggleKeep(url) {
    setKeepMap(prev => ({ ...prev, [url]: !prev[url] }));
  }

  // Helper to upload files (if any) to backend; returns array of uploaded URLs
  async function uploadFilesIfAny() {
    if (!selectedFiles.length) return [];
    const formData = new FormData();
    // append each file with same field name; backend accepts any field and handles multiple files
    selectedFiles.forEach(s => formData.append('files', s.file)); // name doesn't matter due to multer.any()

    try {
      const resp = await axiosInstance.put(`/api/products/${id}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // backend returns: { uploaded: [ {key,url}, ... ], key, url } OR legacy { key, url }
      const data = resp && resp.data ? resp.data : {};
      let uploadedArray = [];
      if (Array.isArray(data.uploaded) && data.uploaded.length) {
        uploadedArray = data.uploaded;
      } else if (data.key && data.url) {
        uploadedArray = [{ key: data.key, url: data.url }];
      } else {
        // defensive: try resp.data directly if array
        if (Array.isArray(data)) {
          uploadedArray = data;
        }
      }

      // extract urls
      const urls = uploadedArray.map(u => (u && u.url) ? u.url : (typeof u === 'string' ? u : null)).filter(Boolean);

      return urls;
    } catch (err) {
      console.error('Upload failed', err);
      throw new Error('Upload request failed');
    }
  }

  // Build final images array (keep existing ones that are checked + newly uploaded)
  function buildFinalImageList(uploadedUrls) {
    const kept = existingImages.filter(url => keepMap[url]);
    // avoid duplicates: include kept first then uploaded that are not already present
    const final = [...kept];
    uploadedUrls.forEach(u => {
      if (!final.includes(u)) final.push(u);
    });
    return final;
  }

  // Save handler: upload selected files (if any), then PUT product with images array
  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);

    try {
      // 1) upload files if selected
      let uploadedUrls = [];
      if (selectedFiles.length) {
        uploadedUrls = await uploadFilesIfAny();
        if (!uploadedUrls.length) {
          alert('Upload failed or returned no URLs. Check the upload endpoint response.');
          setSaving(false);
          return;
        }
      }

      // 2) build images array: kept existing + uploaded
      const images = buildFinalImageList(uploadedUrls);

      // 3) prepare body: convert colors/sizes to arrays, and include images as array of strings
      const body = {
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
        colors: swatches.map(s => s), // store as array (strings/hex)
        sizes: product.sizes ? product.sizes.split(',').map(s => s.trim()).filter(Boolean) : [],
        images // array of string URLs
      };

      // 4) PUT updated product
      const resp = await axiosInstance.put(`/api/products/${id}`, body);
      if (resp && resp.data && resp.data.success) {
        // cleanup previews memory
        selectedFiles.forEach(s => s.previewUrl && URL.revokeObjectURL(s.previewUrl));
        setSelectedFiles([]);
        // Update UI with returned product (if provided)
        const updatedProduct = resp.data.product || resp.data;
        if (updatedProduct) {
          const imgs = Array.isArray(updatedProduct.images)
            ? updatedProduct.images.map(it => (typeof it === 'string' ? it : (it.url || it)))
            : [];
          setExistingImages(imgs);
          const map = {};
          imgs.forEach(url => (map[url] = true));
          setKeepMap(map);
        }

        alert('Product updated');
      } else {
        console.error('Save failed', resp);
        alert('Save failed. Check server response.');
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
    // set current value for input
    if (colorPickerRef.current) {
      const cur = swatches[idx] || '#FFFFFF';
      // ensure it's a hex value for input; fallback to white
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
    setSwatches(prev => {
      const copy = [...prev];
      copy[idx] = val.toUpperCase();
      return copy;
    });
  }

  // Add a new blank swatch
  function addSwatch() {
    setSwatches(prev => [...prev, '#FFFFFF']);
  }

  // Remove swatch
  function removeSwatch(i) {
    setSwatches(prev => prev.filter((_, idx) => idx !== i));
  }

  // Video embed helper (YouTube)
  function getYouTubeEmbedUrl(raw) {
    if (!raw) return null;
    try {
      const u = raw.trim();
      // Look for v= param
      const vMatch = u.match(/[?&]v=([^&]+)/);
      if (vMatch) return `https://www.youtube.com/embed/${vMatch[1]}`;
      // Look for youtu.be/ID
      const short = u.match(/youtu\.be\/([^?&]+)/);
      if (short) return `https://www.youtube.com/embed/${short[1]}`;
      // If already embed url, return as-is
      if (u.includes('youtube.com/embed/')) return u;
      return null;
    } catch {
      return null;
    }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ display: 'flex', gap: 40, padding: 12 }}>
      <form onSubmit={handleSave} style={{ width: '40%' }}>
        <div style={{ marginBottom: 10 }}>
          <button type="button" onClick={() => navigate('/admin/products')}>Back to products</button>
        </div>

        <div>
          <label>Title</label><br />
          <input name="title" value={product.title} onChange={handleChange} style={{ width: '100%' }} />
        </div>

        <div>
          <label>Slug</label><br />
          <input name="slug" value={product.slug} onChange={handleChange} style={{ width: '100%' }} />
        </div>

        <div>
          <label>Price</label><br />
          <input name="price" value={product.price} onChange={handleChange} style={{ width: '100%' }} />
        </div>

        <div>
          <label>MRP</label><br />
          <input name="mrp" value={product.mrp} onChange={handleChange} style={{ width: '100%' }} />
        </div>

        <div>
          <label>Stock</label><br />
          <input name="stock" value={product.stock} onChange={handleChange} style={{ width: '100%' }} />
        </div>

        <div>
          <label>SKU</label><br />
          <input name="sku" value={product.sku} onChange={handleChange} style={{ width: '100%' }} />
        </div>

        <div>
          <label>Brand</label><br />
          <input name="brand" value={product.brand} onChange={handleChange} style={{ width: '100%' }} />
        </div>

        <div>
          <label>Category</label><br />
          <input name="category" value={product.category} onChange={handleChange} style={{ width: '100%' }} />
        </div>

        <div>
          <label>Video URL (YouTube)</label><br />
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
              // try to show a colored box if hex-like; otherwise show a neutral box and label
              const isHex = /^#([0-9A-F]{6})$/i.test(String(c).trim());
              const bg = isHex ? c : '#EEE';
              const suggestedName = isHex ? nearestColorName(c) : (String(c) || '');
              return (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div
                    title={String(c)}
                    onClick={() => openColorPickerAtIndex(i)}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 6,
                      border: '1px solid #ccc',
                      boxShadow: '0 1px 6px rgba(0,0,0,0.12)',
                      background: bg,
                      cursor: 'pointer'
                    }}
                  />
                  <div style={{ fontSize: 12, marginTop: 6, maxWidth: 80, wordBreak: 'break-word' }}>
                    {suggestedName || String(c).slice(0, 12)}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <button type="button" onClick={() => removeSwatch(i)}>Remove</button>
                  </div>
                </div>
              );
            })}

            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button type="button" onClick={addSwatch}>+ Add color</button>
            </div>

            {/* Hidden native color input used for picking */}
            <input
              ref={colorPickerRef}
              type="color"
              style={{ display: 'none' }}
              onChange={onColorPickerChange}
              aria-hidden="true"
            />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Sizes (comma-separated)</label><br />
          <input name="sizes" value={product.sizes} onChange={handleChange} style={{ width: '100%' }} />
        </div>

        <div>
          <label>Description</label><br />
          <textarea name="description" value={product.description} onChange={handleChange} rows={6} style={{ width: '100%' }} />
        </div>

        <div>
          <label>
            <input name="isPublished" type="checkbox" checked={product.isPublished} onChange={handleChange} /> Published
          </label>
        </div>

        <div style={{ marginTop: 8 }}>
          <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          <button type="button" onClick={() => navigate('/admin/products')}>Cancel</button>
        </div>
      </form>

      <div style={{ width: '50%' }}>
        <h3>Existing Images</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {existingImages.map((url, idx) => (
            <div key={url} style={{ textAlign: 'center', width: 120 }}>
              <img src={url} alt={`img-${idx}`} style={{ width: 100, height: 100, objectFit: 'cover' }} />
              <div>
                <label>
                  <input
                    type="checkbox"
                    checked={!!keepMap[url]}
                    onChange={() => toggleKeep(url)}
                  /> Keep
                </label>
              </div>
              <div>
                <button type="button" onClick={() => { setKeepMap(prev => ({ ...prev, [url]: false })); }}>Remove</button>
              </div>
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
              <div>
                <button type="button" onClick={() => removeSelectedPreview(i)}>Remove</button>
              </div>
            </div>
          ))}
          {selectedFiles.length === 0 && <div>No files chosen</div>}
        </div>

        <div style={{ marginTop: 20 }}>
          <h4>Video preview</h4>
          {product.videoUrl ? (
            (() => {
              const embed = getYouTubeEmbedUrl(product.videoUrl);
              if (embed) {
                return (
                  <div style={{ width: '100%', height: 250 }}>
                    <iframe
                      title="video-preview"
                      src={embed}
                      style={{ width: '100%', height: '100%', border: 'none' }}
                      allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                );
              }
              return <div>Unsupported video URL (currently only YouTube links are previewed).</div>;
            })()
          ) : (
            <div>No video URL provided</div>
          )}
        </div>
      </div>
    </div>
  );
}
