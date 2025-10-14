// frontend/src/admin/AdminProductEdit.js
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

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/admin-api/products/${id}`);
        if (!res.ok) throw new Error('Failed to load product');
        const data = await res.json();
        if (!mounted) return;

        data.images = Array.isArray(data.images) ? data.images : [];

        const initialKeep = {};
        data.images.forEach((img, idx) => {
          const key = img._id ? String(img._id) : (img.filename || img.url || `temp-${idx}`);
          img.__key = key;
          initialKeep[key] = true;
        });

        setProduct(data);
        setKeepMap(initialKeep);
        setColorsText(Array.isArray(data.colors) ? data.colors.join(',') : (data.colors || ''));
        setSizesText(Array.isArray(data.sizes) ? data.sizes.join(',') : (data.sizes || ''));
      } catch (err) {
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

  async function handleSubmit(e) {
    e.preventDefault();
    if (!product) return;

    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setSaving(true);
    setError(null);

    try {
      const form = new FormData();

      form.append('title', product.title || '');
      form.append('description', product.description || '');
      form.append('price', product.price ?? 0);
      form.append('stock', product.stock ?? 0);
      form.append('sku', product.sku || '');
      form.append('brand', product.brand || '');
      form.append('category', product.category || '');

      const colorsArr = colorsText && colorsText.trim()
        ? colorsText.split(',').map(s => s.trim()).filter(Boolean)
        : [];
      const sizesArr = sizesText && sizesText.trim()
        ? sizesText.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      if (colorsArr.length > 0) {
        form.append('colors_json', JSON.stringify(colorsArr));
        colorsArr.forEach(c => form.append('colors[]', c));
      }

      if (sizesArr.length > 0) {
        form.append('sizes_json', JSON.stringify(sizesArr));
        sizesArr.forEach(s => form.append('sizes[]', s));
      }

      const kept = [];
      if (Array.isArray(product.images)) {
        product.images.forEach(img => {
          const key = img.__key;
          if (!key) return;
          if (keepMap[key]) {
            if (img._id) kept.push(String(img._id));
            else if (img.url) kept.push(img.url);
            else if (img.filename) kept.push(img.filename);
          }
        });
      }
      form.append('existingImages', JSON.stringify(kept));

      newFiles.forEach(f => form.append('images', f, f.name));

      const res = await fetch(`${API_BASE}/admin-api/products/${id}?permanent=true`, {
        method: 'PUT',
        body: form
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Save failed: ${res.status} ${txt}`);
      }

      const saved = await res.json();
      setProduct(saved);
      setColorsText(Array.isArray(saved.colors) ? saved.colors.join(',') : (saved.colors || ''));
      setSizesText(Array.isArray(saved.sizes) ? saved.sizes.join(',') : (saved.sizes || ''));

      // navigate to list after a short confirmation delay
      setTimeout(() => { navigate('/admin/products'); }, 600);
    } catch (err) {
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

      <form onSubmit={handleSubmit}>
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

        <div style={{ marginBottom: 8 }}>
          <label>
            Brand / Category<br />
            <input
              value={product.brand || ''}
              onChange={e => setProduct({ ...product, brand: e.target.value })}
              placeholder="Brand"
              style={{ width: '48%', padding: 8, marginRight: '4%' }}
            />
            <input
              value={product.category || ''}
              onChange={e => setProduct({ ...product, category: e.target.value })}
              placeholder="Category"
              style={{ width: '48%', padding: 8 }}
            />
          </label>
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
              const src = (img.url && img.url.startsWith('/'))
                ? (API_BASE + img.url)
                : (img.filename ? (API_BASE + '/uploads/' + img.filename) : (img.url || ''));
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
