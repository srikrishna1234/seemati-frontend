// src/admin/AdminProductEdit.js
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_URL || '';

export default function AdminProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [newFiles, setNewFiles] = useState([]);
  const [keepMap, setKeepMap] = useState({});
  const [colorsText, setColorsText] = useState('');
  const [sizesText, setSizesText] = useState('');

  const isSubmittingRef = useRef(false);

  function normalizeImages(arr) {
    const out = [];
    (Array.isArray(arr) ? arr : []).forEach((img, idx) => {
      if (!img) return;
      if (typeof img === 'string') {
        const raw = img.trim();
        if (!raw) return;
        const isFullUrl = /^https?:\/\//i.test(raw);
        const url = isFullUrl ? raw : (raw.startsWith('/') ? (API_BASE + raw) : (API_BASE + '/uploads/' + raw));
        const filename = raw.includes('/') ? raw.split('/').pop() : raw;
        out.push({ __key: `str-${idx}`, filename, url, original: raw });
        return;
      }
      if (typeof img === 'object') {
        const candUrl = img.url || img.path || img.publicUrl || img.file || null;
        const candFilename = img.filename || img.name || (candUrl ? String(candUrl).split('/').pop() : null);
        const url = candUrl
          ? (String(candUrl).startsWith('http') ? String(candUrl) : (String(candUrl).startsWith('/') ? (API_BASE + String(candUrl)) : (API_BASE + '/uploads/' + String(candUrl))))
          : (API_BASE + '/uploads/' + candFilename);
        const key = img._id ? String(img._id) : (candFilename || url || `obj-${idx}`);
        out.push({ ...img, __key: key, filename: candFilename, url });
        return;
      }
      const s = String(img).trim();
      if (s) {
        out.push({ __key: `fallback-${idx}`, filename: s, url: API_BASE + '/uploads/' + s });
      }
    });
    return out;
  }

  function normalizeColorsField(rawColors) {
    if (!rawColors) return [];
    if (Array.isArray(rawColors)) {
      return rawColors
        .flatMap(c => {
          if (!c) return [];
          if (typeof c === 'string') return c.split(',').map(s => s.trim()).filter(Boolean);
          if (typeof c === 'object') return [c.name || c.label || c.code || ''].filter(Boolean);
          return [String(c)];
        })
        .filter(Boolean);
    }
    if (typeof rawColors === 'string') {
      if (rawColors.trim() === '[object Object]') return [];
      return rawColors.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (typeof rawColors === 'object') {
      return [rawColors.name || rawColors.label || rawColors.code].filter(Boolean);
    }
    return [];
  }

  // helper: handle 401 centrally in this component
  function handle401() {
    try { localStorage.removeItem('token'); localStorage.removeItem('user'); } catch (e) {}
    navigate('/admin/login');
  }

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/admin-api/products/${id}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token') || ''}`
          }
        });

        if (res.status === 401) {
          if (mounted) handle401();
          return;
        }

        if (!res.ok) throw new Error('Failed to load product');

        const dataRaw = await res.json();
        if (!mounted) return;

        // Accept either { ok: true, product: {...} } OR raw product object
        const data = dataRaw && dataRaw.product ? dataRaw.product : dataRaw;

        // Normalize fields for UI
        data.images = normalizeImages(data.images || []);

        const initialKeep = {};
        (data.images || []).forEach(img => {
          const key = img.__key || (img._id ? String(img._id) : null);
          if (key) initialKeep[key] = true;
        });

        const normalizedColors = normalizeColorsField(data.colors);
        const normalizedSizes = Array.isArray(data.sizes)
          ? data.sizes.map(s => (typeof s === 'string' ? s.trim() : String(s))).filter(Boolean)
          : (typeof data.sizes === 'string' ? data.sizes.split(',').map(s => s.trim()).filter(Boolean) : []);

        setProduct(data);
        setKeepMap(initialKeep);
        setColorsText(normalizedColors.join(','));
        setSizesText(normalizedSizes.join(','));
      } catch (err) {
        console.error(err);
        if (mounted) setError(err.message || 'Error loading product');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [id]);

  function handleFileChange(e) {
    setNewFiles(Array.from(e.target.files || []));
  }

  function toggleKeep(key) {
    setKeepMap(prev => ({ ...prev, [key]: !prev[key] }));
  }

  // --- NEW robust submit: upload new files first, then send JSON PUT ---
  async function handleSubmit(e) {
    e.preventDefault();
    if (!product) return;
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setSaving(true);
    setError(null);

    try {
      // Build kept images array (as objects with filename + url if available)
      const keptObjects = [];
      if (Array.isArray(product.images) && product.images.length > 0) {
        product.images.forEach(img => {
          const key = img.__key;
          const keepValue = (key && Object.prototype.hasOwnProperty.call(keepMap, key)) ? !!keepMap[key] : true;
          if (!keepValue) return;
          // prefer filename + url if present
          if (img.filename || img.url) {
            keptObjects.push({ filename: img.filename || null, url: img.url || null, _id: img._id || undefined });
          } else if (img._id) {
            keptObjects.push({ _id: String(img._id) });
          }
        });
      }

      // If nothing selected to keep, default to all existing images
      if (keptObjects.length === 0 && Array.isArray(product.images) && product.images.length > 0) {
        product.images.forEach(img => {
          keptObjects.push({ filename: img.filename || null, url: img.url || null, _id: img._id || undefined });
        });
      }

      // 1) Upload newFiles (if any) to /admin-api/products/upload
      const uploadedImages = [];
      if (newFiles.length > 0) {
        const token = localStorage.getItem('token');
        if (!token) {
          handle401();
          return;
        }

        for (const file of newFiles) {
          const fd = new FormData();
          fd.append('file', file, file.name);
          const uploadRes = await fetch(`${API_BASE}/admin-api/products/upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: fd,
          });

          if (uploadRes.status === 401) {
            handle401();
            return;
          }

          const uploadJson = await uploadRes.json().catch(() => null);
          if (!uploadRes.ok || !uploadJson || !uploadJson.ok) {
            throw new Error(uploadJson && uploadJson.message ? uploadJson.message : `Upload failed: ${uploadRes.status}`);
          }
          // push returned filename+url object
          uploadedImages.push({ filename: uploadJson.filename, url: uploadJson.url });
        }
      }

      // 2) Prepare payload (JSON) and coerce numeric values
      const colorsArr = colorsText && colorsText.trim()
        ? colorsText.split(',').map(s => s.trim()).filter(Boolean)
        : [];
      const sizesArr = sizesText && sizesText.trim()
        ? sizesText.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      const imagesForPayload = [
        // convert keptObjects into consistent objects: { filename, url } only
        ...keptObjects.map(k => {
          if (k.filename && k.filename !== 'null') return { filename: k.filename, url: k.url || null };
          if (k.url) return { filename: k.url.split('/').pop(), url: k.url };
          if (k._id) return { filename: String(k._id) }; // fallback
          return null;
        }).filter(Boolean),
        // add newly uploaded images
        ...uploadedImages
      ];

      const payload = {
        title: product.title || '',
        description: product.description || '',
        price: (product.price !== undefined && product.price !== null && product.price !== '') ? Number(product.price) : undefined,
        mrp: (product.mrp !== undefined && product.mrp !== null && product.mrp !== '') ? Number(product.mrp) : undefined,
        stock: (product.stock !== undefined && product.stock !== null && product.stock !== '') ? Number(product.stock) : undefined,
        sku: product.sku || '',
        brand: product.brand || '',
        category: product.category || '',
        videoUrl: product.videoUrl || '',
        colors: colorsArr,
        sizes: sizesArr,
        images: imagesForPayload // send as array of objects
      };

      // 3) Send JSON PUT to update product
      const token2 = localStorage.getItem('token');
      if (!token2) {
        handle401();
        return;
      }

      const res = await fetch(`${API_BASE}/admin-api/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token2}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        handle401();
        return;
      }

      const savedRaw = await res.json().catch(() => null);
      console.log('Save response (raw):', savedRaw);

      if (!res.ok) {
        if (savedRaw && savedRaw.code === 11000) {
          throw new Error('Duplicate key error: ' + JSON.stringify(savedRaw.keyValue || {}));
        }
        if (savedRaw && savedRaw.message) throw new Error(savedRaw.message);
        throw new Error(`Save failed: ${res.status}`);
      }

      const saved = savedRaw && savedRaw.product ? savedRaw.product : savedRaw;

      if (saved) {
        console.log('Saved product returned by server:', saved);
        const normalized = saved;
        normalized.images = normalizeImages(normalized.images || []);
        const newKeep = {};
        normalized.images.forEach(img => {
          const key = img.__key || (img._id ? String(img._id) : null);
          if (key) newKeep[key] = true;
        });
        setProduct(normalized);
        setKeepMap(newKeep);

        const savedColors = Array.isArray(normalized.colors)
          ? normalized.colors.map(c => (typeof c === 'object' ? (c.name || c.code || '') : String(c))).filter(Boolean)
          : (typeof normalized.colors === 'string' ? normalized.colors.split(',').map(s => s.trim()).filter(Boolean) : []);
        const savedSizes = Array.isArray(normalized.sizes) ? normalized.sizes : (normalized.sizes ? String(normalized.sizes).split(',').map(s => s.trim()) : []);
        setColorsText(savedColors.join(','));
        setSizesText(savedSizes.join(','));
      } else {
        // fallback: fetch fresh
        const fresh = await fetch(`${API_BASE}/admin-api/products/${id}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
        });

        if (fresh.status === 401) {
          handle401();
          return;
        }

        if (!fresh.ok) throw new Error('Saved but failed to fetch updated product');
        const freshJson = await fresh.json();
        const freshData = freshJson && freshJson.product ? freshJson.product : freshJson;
        freshData.images = normalizeImages(freshData.images || []);
        setProduct(freshData);
        const newKeep = {};
        (freshData.images || []).forEach(img => {
          const key = img.__key || (img._id ? String(img._id) : null);
          if (key) newKeep[key] = true;
        });
        setKeepMap(newKeep);
        const savedColors = Array.isArray(freshData.colors)
          ? freshData.colors.map(c => (typeof c === 'object' ? (c.name || c.code || '') : String(c))).filter(Boolean)
          : (typeof freshData.colors === 'string' ? freshData.colors.split(',').map(s => s.trim()).filter(Boolean) : []);
        const savedSizes = Array.isArray(freshData.sizes) ? freshData.sizes : (freshData.sizes ? String(freshData.sizes).split(',').map(s => s.trim()) : []);
        setColorsText(savedColors.join(','));
        setSizesText(savedSizes.join(','));
      }

      setNewFiles([]);
      try { localStorage.setItem('product-updated', JSON.stringify({ id: id, ts: Date.now() })); } catch (e) {}

      setTimeout(() => { navigate('/admin/products'); }, 600);
    } catch (err) {
      console.error('Edit save error:', err);
      setError(err.message || 'Save failed');
    } finally {
      setSaving(false);
      isSubmittingRef.current = false;
    }
  }

  if (loading) return <div>Loading product…</div>;
  if (!product) return <div style={{ color: 'red' }}>{error || 'Product not found'}</div>;

  const willRemoveCount = product.images.filter(img => {
    const key = img.__key;
    return key && !keepMap[key];
  }).length;

  return (
    <div style={{ padding: 12 }}>
      <h2>Edit Product</h2>
      {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ marginBottom: 8 }}>
          <label>
            Title<br />
            <input
              value={product.title || ''}
              onChange={e => setProduct({ ...product, title: e.target.value })}
              required
              style={{ width: '100%', padding: 8 }}
            />
          </label>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
          <label style={{ flex: 1 }}>
            Price<br />
            <input
              type="number"
              value={product.price ?? 0}
              onChange={e => setProduct({ ...product, price: Number(e.target.value) })}
              style={{ width: '100%', padding: 8 }}
            />
          </label>

          <label style={{ width: 160 }}>
            Stock<br />
            <input
              type="number"
              value={product.stock ?? 0}
              onChange={e => setProduct({ ...product, stock: Number(e.target.value) })}
              style={{ width: '100%', padding: 8 }}
            />
          </label>
        </div>

        <div style={{ marginBottom: 8 }}>
          <label>
            SKU<br />
            <input
              value={product.sku || ''}
              onChange={e => setProduct({ ...product, sku: e.target.value })}
              style={{ width: '100%', padding: 8 }}
            />
          </label>
        </div>

        <div style={{ marginBottom: 8, display: 'flex', gap: '4%' }}>
          <div style={{ width: '48%' }}>
            <label>
              Brand<br />
              <input
                value={product.brand || ''}
                onChange={e => setProduct({ ...product, brand: e.target.value })}
                placeholder="Brand"
                style={{ width: '100%', padding: 8 }}
              />
            </label>
          </div>

          <div style={{ width: '48%' }}>
            <label>
              Category<br />
              <input
                value={product.category || ''}
                onChange={e => setProduct({ ...product, category: e.target.value })}
                placeholder="Category"
                style={{ width: '100%', padding: 8 }}
              />
            </label>
          </div>
        </div>

        <div style={{ marginBottom: 8, display: 'flex', gap: '4%' }}>
          <div style={{ width: '48%' }}>
            <label>
              MRP<br />
              <input
                type="number"
                value={product.mrp ?? 0}
                onChange={e => setProduct({ ...product, mrp: Number(e.target.value) })}
                style={{ width: '100%', padding: 8 }}
              />
            </label>
          </div>

          <div style={{ width: '48%' }}>
            <label>
              Video URL (optional)<br />
              <input
                value={product.videoUrl || ''}
                onChange={e => setProduct({ ...product, videoUrl: e.target.value })}
                placeholder="https://..."
                style={{ width: '100%', padding: 8 }}
              />
            </label>
          </div>
        </div>

        <div style={{ marginBottom: 8 }}>
          <label>
            Colors (comma-separated)<br />
            <input
              value={colorsText}
              onChange={e => setColorsText(e.target.value)}
              placeholder="e.g. red, blue, green"
              style={{ width: '100%', padding: 8 }}
            />
          </label>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>
            Sizes (comma-separated)<br />
            <input
              value={sizesText}
              onChange={e => setSizesText(e.target.value)}
              placeholder="e.g. S, M, L, XL"
              style={{ width: '100%', padding: 8 }}
            />
          </label>
        </div>

        <div style={{ marginBottom: 8 }}>
          <strong>Existing Images</strong>
          <div style={{ marginTop: 6, fontSize: 13, color: '#444' }}>
            {willRemoveCount > 0 ? `${willRemoveCount} image(s) marked for removal` : 'No images marked for removal'}
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
            {product.images.length === 0 && <div>No images</div>}
            {product.images.map(img => {
              const key = img.__key;
              const src = img.url || (img.filename ? (API_BASE + '/uploads/' + img.filename) : (img.url || ''));
              const kept = !!keepMap[key];

              return (
                <div
                  key={key}
                  style={{
                    width: 220,
                    border: '1px solid #eee',
                    padding: 8,
                    position: 'relative',
                    background: kept ? '#fff' : '#fff7f7'
                  }}
                >
                  <a href={src} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
                    <img
                      src={src}
                      alt=""
                      style={{
                        width: '100%',
                        height: 180,
                        objectFit: 'contain',
                        background: '#fafafa',
                        opacity: kept ? 1 : 0.45,
                        transition: 'opacity .15s'
                      }}
                    />
                  </a>

                  {!kept && (
                    <div style={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      background: '#ffefef',
                      color: '#b30000',
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontSize: 12,
                    }}>
                      Will be removed
                    </div>
                  )}

                  <div style={{ marginTop: 6 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={kept}
                        onChange={() => toggleKeep(key)}
                      />
                      Keep
                    </label>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>
                      {img.filename || img.url || '(no name)'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <strong>Upload new images</strong>
          <div style={{ marginTop: 8 }}>
            <input type="file" accept="image/*" multiple onChange={handleFileChange} />
            {newFiles.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div>New files:</div>
                <ul>
                  {newFiles.map((f, i) => (
                    <li key={i}>{f.name} — {Math.round(f.size / 1024)} KB</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <button type="submit" disabled={saving} style={{ padding: '8px 16px', marginRight: 8 }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={() => navigate('/admin/products')} style={{ padding: '8px 16px' }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
