// src/admin/AdminProductEdit.js
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance'; // adjust if your path is different

export default function AdminProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

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

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const resp = await axiosInstance.get(`/api/products/${id}`);
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
        } else {
          alert('Failed to load product.');
        }
      } catch (err) {
        console.error('Failed to fetch product', err);
        alert('Error loading product. See console.');
      } finally {
        setLoading(false);
      }
    }
    load();
    // cleanup previews on unmount
    return () => {
      selectedFiles.forEach(s => s.previewUrl && URL.revokeObjectURL(s.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Handle input changes
  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    if (name === 'isPublished') {
      setProduct(prev => ({ ...prev, isPublished: !!checked }));
    } else {
      setProduct(prev => ({ ...prev, [name]: value }));
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
        colors: product.colors ? product.colors.split(',').map(s => s.trim()).filter(Boolean) : [],
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
        // Optionally navigate back:
        // navigate('/admin/products');
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

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ display: 'flex', gap: 40 }}>
      <form onSubmit={handleSave} style={{ width: '40%' }}>
        <button type="button" onClick={() => navigate('/admin/products')}>Back to products</button>

        <div>
          <label>Title</label><br />
          <input name="title" value={product.title} onChange={handleChange} />
        </div>

        <div>
          <label>Slug</label><br />
          <input name="slug" value={product.slug} onChange={handleChange} />
        </div>

        <div>
          <label>Price</label><br />
          <input name="price" value={product.price} onChange={handleChange} />
        </div>

        <div>
          <label>MRP</label><br />
          <input name="mrp" value={product.mrp} onChange={handleChange} />
        </div>

        <div>
          <label>Stock</label><br />
          <input name="stock" value={product.stock} onChange={handleChange} />
        </div>

        <div>
          <label>SKU</label><br />
          <input name="sku" value={product.sku} onChange={handleChange} />
        </div>

        <div>
          <label>Brand</label><br />
          <input name="brand" value={product.brand} onChange={handleChange} />
        </div>

        <div>
          <label>Category</label><br />
          <input name="category" value={product.category} onChange={handleChange} />
        </div>

        <div>
          <label>Video URL</label><br />
          <input name="videoUrl" value={product.videoUrl} onChange={handleChange} />
        </div>

        <div>
          <label>Colors (comma-separated)</label><br />
          <input name="colors" value={product.colors} onChange={handleChange} />
        </div>

        <div>
          <label>Sizes (comma-separated)</label><br />
          <input name="sizes" value={product.sizes} onChange={handleChange} />
        </div>

        <div>
          <label>Description</label><br />
          <textarea name="description" value={product.description} onChange={handleChange} rows={6} />
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

      <div style={{ width: '40%' }}>
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
      </div>
    </div>
  );
}
