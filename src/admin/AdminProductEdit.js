import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";

export default function AdminProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [product, setProduct] = useState(null);

  // Basic fields
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [price, setPrice] = useState("");
  const [mrp, setMrp] = useState("");
  const [description, setDescription] = useState("");
  const [stock, setStock] = useState("");
  const [sku, setSku] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [published, setPublished] = useState(false);

  // arrays stored as comma-separated in simple UI
  const [colorsInput, setColorsInput] = useState("");
  const [sizesInput, setSizesInput] = useState("");
  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);

  // images
  const [existingImages, setExistingImages] = useState([]);
  const [removedExistingIndexes, setRemovedExistingIndexes] = useState(new Set());
  const [newFiles, setNewFiles] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);

  useEffect(() => {
    async function fetchProduct() {
      try {
        setLoading(true);
        const res = await axiosInstance.get(`/api/products/${id}`);
        const p = res.data;
        setProduct(p);

        setTitle(p.title || "");
        setSlug(p.slug || "");
        setPrice(p.price !== undefined ? p.price : "");
        setMrp(p.mrp !== undefined ? p.mrp : "");
        setDescription(p.description || "");
        setStock(p.stock !== undefined ? p.stock : "");
        setSku(p.sku || "");
        setBrand(p.brand || "");
        setCategory(p.category || "");
        setVideoUrl(p.videoUrl || "");
        setPublished(Boolean(p.published));

        const cs = Array.isArray(p.colors) ? p.colors.join(",") : (p.colors || "");
        const ss = Array.isArray(p.sizes) ? p.sizes.join(",") : (p.sizes || "");
        setColorsInput(cs);
        setSizesInput(ss);
        setColors(Array.isArray(p.colors) ? p.colors : []);
        setSizes(Array.isArray(p.sizes) ? p.sizes : []);

        setExistingImages(Array.isArray(p.images) ? p.images : []);
      } catch (err) {
        console.error("fetchProduct error:", err);
        setError(err?.response?.data?.message || err.message || "Failed to load product");
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [id]);

  function handleNewFilesChange(e) {
    const files = Array.from(e.target.files || []);
    setNewFiles(files);
    const previews = files.map((f) => URL.createObjectURL(f));
    setNewPreviews(previews);
  }

  function toggleRemoveExisting(index) {
    const s = new Set(removedExistingIndexes);
    if (s.has(index)) s.delete(index);
    else s.add(index);
    setRemovedExistingIndexes(s);
  }

  function removeNewFile(i) {
    const nf = [...newFiles];
    nf.splice(i, 1);
    setNewFiles(nf);

    const np = [...newPreviews];
    if (np[i]) URL.revokeObjectURL(np[i]);
    np.splice(i, 1);
    setNewPreviews(np);
  }

  function getKeepImages() {
    return existingImages.filter((_, idx) => !removedExistingIndexes.has(idx));
  }

  function parseCommaList(text) {
    if (!text) return [];
    return text.split(",").map(s => s.trim()).filter(Boolean);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      // update arrays from inputs
      const colorsArr = parseCommaList(colorsInput);
      const sizesArr = parseCommaList(sizesInput);

      // If there are new files, use multipart upload endpoint
      if (newFiles.length > 0) {
        const formData = new FormData();
        formData.append("title", title);
        formData.append("slug", slug);
        formData.append("price", price);
        formData.append("mrp", mrp);
        formData.append("description", description);
        formData.append("stock", stock);
        formData.append("sku", sku);
        formData.append("brand", brand);
        formData.append("category", category);
        formData.append("videoUrl", videoUrl);
        formData.append("published", published ? "1" : "0");
        formData.append("colors", JSON.stringify(colorsArr));
        formData.append("sizes", JSON.stringify(sizesArr));
        formData.append("keepImages", JSON.stringify(getKeepImages()));

        newFiles.forEach((file) => formData.append("images", file));

        const resp = await axiosInstance.put(`/api/products/${id}/upload`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        // update UI with server response: server returns absolute image URLs
        const updatedProduct = resp.data;
        setExistingImages(Array.isArray(updatedProduct.images) ? updatedProduct.images : []);
        setRemovedExistingIndexes(new Set());
        // clear new files and previews
        newPreviews.forEach((u) => URL.revokeObjectURL(u));
        setNewPreviews([]);
        setNewFiles([]);
        // update other fields from response as well (if desired)
        setTitle(updatedProduct.title || title);
        setSlug(updatedProduct.slug || slug);
        setPrice(updatedProduct.price || price);
        setMrp(updatedProduct.mrp || mrp);
        setDescription(updatedProduct.description || description);
        setStock(updatedProduct.stock || stock);
        setSku(updatedProduct.sku || sku);
        setBrand(updatedProduct.brand || brand);
        setCategory(updatedProduct.category || category);
        setVideoUrl(updatedProduct.videoUrl || videoUrl);
        setPublished(Boolean(updatedProduct.published));
        setColors(Array.isArray(updatedProduct.colors) ? updatedProduct.colors : colorsArr);
        setColorsInput((Array.isArray(updatedProduct.colors) ? updatedProduct.colors.join(",") : colorsArr.join(",")));
        setSizes(Array.isArray(updatedProduct.sizes) ? updatedProduct.sizes : sizesArr);
        setSizesInput((Array.isArray(updatedProduct.sizes) ? updatedProduct.sizes.join(",") : sizesArr.join(",")));

        // stay on page (allow further edits)
      } else {
        // No new files: JSON PUT (server sanitizes images if present)
        const payload = {
          title,
          slug,
          price,
          mrp,
          description,
          stock,
          sku,
          brand,
          category,
          videoUrl,
          published,
          colors: colorsArr,
          sizes: sizesArr,
          images: getKeepImages(), // send array of URLs to set images if user removed some
        };

        const resp = await axiosInstance.put(`/api/products/${id}`, payload, {
          headers: { "Content-Type": "application/json" },
        });

        const updatedProduct = resp.data;
        // refresh local state from server response
        setExistingImages(Array.isArray(updatedProduct.images) ? updatedProduct.images : []);
        setRemovedExistingIndexes(new Set());
        setTitle(updatedProduct.title || title);
        setSlug(updatedProduct.slug || slug);
        setPrice(updatedProduct.price || price);
        setMrp(updatedProduct.mrp || mrp);
        setDescription(updatedProduct.description || description);
        setStock(updatedProduct.stock || stock);
        setSku(updatedProduct.sku || sku);
        setBrand(updatedProduct.brand || brand);
        setCategory(updatedProduct.category || category);
        setVideoUrl(updatedProduct.videoUrl || videoUrl);
        setPublished(Boolean(updatedProduct.published));
        setColors(Array.isArray(updatedProduct.colors) ? updatedProduct.colors : colorsArr);
        setColorsInput(Array.isArray(updatedProduct.colors) ? updatedProduct.colors.join(",") : colorsArr.join(","));
        setSizes(Array.isArray(updatedProduct.sizes) ? updatedProduct.sizes : sizesArr);
        setSizesInput(Array.isArray(updatedProduct.sizes) ? updatedProduct.sizes.join(",") : sizesArr.join(","));
      }

      // indicate success briefly
      setError(null);
    } catch (err) {
      console.error("Update failed:", err);
      setError(err?.response?.data?.message || err.message || "Update failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ padding: 20 }}>Loading product...</div>;

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 20 }}>
      <h1>Edit product — {title || (product && product.title) || "—"}</h1>

      <div style={{ marginBottom: 12 }}>
        <button onClick={() => navigate("/admin/products")}>Back to products</button>
      </div>

      {error && <div style={{ color: "crimson", marginBottom: 12 }}><strong>Error:</strong> {String(error)}</div>}

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 20 }}>
          <div>
            <label style={{ display: "block", marginBottom: 8 }}>
              Title
              <input value={title} onChange={(e) => setTitle(e.target.value)} required style={{ width: "100%", padding: 8 }} />
            </label>

            <label style={{ display: "block", marginBottom: 8 }}>
              Slug
              <input value={slug} onChange={(e) => setSlug(e.target.value)} style={{ width: "100%", padding: 8 }} />
            </label>

            <label style={{ display: "block", marginBottom: 8 }}>
              Price
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} style={{ width: "100%", padding: 8 }} />
            </label>

            <label style={{ display: "block", marginBottom: 8 }}>
              MRP
              <input type="number" value={mrp} onChange={(e) => setMrp(e.target.value)} style={{ width: "100%", padding: 8 }} />
            </label>

            <label style={{ display: "block", marginBottom: 8 }}>
              Stock
              <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} style={{ width: "100%", padding: 8 }} />
            </label>

            <label style={{ display: "block", marginBottom: 8 }}>
              SKU
              <input value={sku} onChange={(e) => setSku(e.target.value)} style={{ width: "100%", padding: 8 }} />
            </label>

            <label style={{ display: "block", marginBottom: 8 }}>
              Brand
              <input value={brand} onChange={(e) => setBrand(e.target.value)} style={{ width: "100%", padding: 8 }} />
            </label>

            <label style={{ display: "block", marginBottom: 8 }}>
              Category
              <input value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: "100%", padding: 8 }} />
            </label>

            <label style={{ display: "block", marginBottom: 8 }}>
              Video URL
              <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} style={{ width: "100%", padding: 8 }} />
            </label>

            <label style={{ display: "block", marginBottom: 8 }}>
              Colors (comma-separated)
              <input value={colorsInput} onChange={(e) => setColorsInput(e.target.value)} style={{ width: "100%", padding: 8 }} />
            </label>

            <label style={{ display: "block", marginBottom: 8 }}>
              Sizes (comma-separated)
              <input value={sizesInput} onChange={(e) => setSizesInput(e.target.value)} style={{ width: "100%", padding: 8 }} />
            </label>

            <label style={{ display: "block", marginBottom: 8 }}>
              Description
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} style={{ width: "100%", padding: 8 }} />
            </label>

            <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
              Published
            </label>
          </div>

          <div>
            <div style={{ marginBottom: 8 }}>
              <strong>Existing images</strong>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                {existingImages.length === 0 && <div style={{ color: "#666" }}>No images</div>}
                {existingImages.map((img, idx) => {
                  const removed = removedExistingIndexes.has(idx);
                  return (
                    <div key={idx} style={{ width: 140, position: "relative", opacity: removed ? 0.4 : 1 }}>
                      <img src={img} alt={`img-${idx}`} style={{ width: "100%", height: 110, objectFit: "cover", border: "1px solid #ddd" }} onError={(e)=>{e.target.src='https://via.placeholder.com/140x110?text=No+Image'}} />
                      <button
                        type="button"
                        onClick={() => toggleRemoveExisting(idx)}
                        style={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          background: removed ? "green" : "rgba(0,0,0,0.6)",
                          color: "white",
                          border: "none",
                          padding: "3px 6px",
                          cursor: "pointer",
                        }}
                        title={removed ? "Undo remove" : "Remove image"}
                      >
                        {removed ? "Undo" : "X"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <strong>Add new images</strong>
              <input type="file" accept="image/*" multiple onChange={handleNewFilesChange} style={{ display: "block", marginTop: 8 }} />

              {newPreviews.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <strong>New files (preview)</strong>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    {newPreviews.map((p, i) => (
                      <div key={i} style={{ width: 140, position: "relative" }}>
                        <img src={p} alt={`new-${i}`} style={{ width: "100%", height: 110, objectFit: "cover", border: "1px solid #ddd" }} />
                        <button
                          type="button"
                          onClick={() => removeNewFile(i)}
                          style={{
                            position: "absolute",
                            top: 4,
                            right: 4,
                            background: "rgba(0,0,0,0.6)",
                            color: "white",
                            border: "none",
                            padding: "3px 6px",
                            cursor: "pointer",
                          }}
                        >
                          X
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <button type="submit" disabled={saving} style={{ padding: "8px 12px", marginRight: 8 }}>
            {saving ? "Saving..." : "Save"}
          </button>
          <button type="button" onClick={() => navigate("/admin/products")} style={{ padding: "8px 12px" }}>
            Done
          </button>
        </div>
      </form>
    </div>
  );
}
