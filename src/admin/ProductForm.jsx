// src/admin/ProductForm.js
import React, { useEffect, useState } from "react";

/*
  ProductForm replacement
  - Controlled form component that returns (values, files) to onSave
  - Does not perform upload by itself (caller handles upload)
  - Accepts `initial` prop and `saving` boolean
*/

export default function ProductForm({ initial = {}, onSave, saving = false }) {
  const [title, setTitle] = useState(initial.title || "");
  const [description, setDescription] = useState(initial.description || "");
  const [price, setPrice] = useState(initial.price ?? "");
  const [mrp, setMrp] = useState(initial.mrp ?? "");
  const [stock, setStock] = useState(initial.stock ?? "");
  const [sku, setSku] = useState(initial.sku || "");
  const [brand, setBrand] = useState(initial.brand || "");
  const [category, setCategory] = useState(initial.category || "");
  const [sizesText, setSizesText] = useState(Array.isArray(initial.sizes) ? initial.sizes.join(",") : (initial.sizes || ""));
  const [colorsText, setColorsText] = useState(Array.isArray(initial.colors) ? initial.colors.join(",") : (initial.colors || ""));
  const [files, setFiles] = useState([]);

  useEffect(() => {
    // update when initial changes
    setTitle(initial.title || "");
    setDescription(initial.description || "");
    setPrice(initial.price ?? "");
    setMrp(initial.mrp ?? "");
    setStock(initial.stock ?? "");
    setSku(initial.sku || "");
    setBrand(initial.brand || "");
    setCategory(initial.category || "");
    setSizesText(Array.isArray(initial.sizes) ? initial.sizes.join(",") : (initial.sizes || ""));
    setColorsText(Array.isArray(initial.colors) ? initial.colors.join(",") : (initial.colors || ""));
    setFiles([]);
  }, [initial]);

  function handleFiles(e) {
    setFiles(Array.from(e.target.files || []));
  }

  function gatherValues() {
    const sizes = sizesText && sizesText.trim() ? sizesText.split(",").map(s => s.trim()).filter(Boolean) : [];
    const colors = colorsText && colorsText.trim() ? colorsText.split(",").map(s => s.trim()).filter(Boolean) : [];
    return {
      title: title.trim(), description: description.trim(),
      price: Number(price || 0), mrp: Number(mrp || 0),
      stock: Number(stock || 0), sku: sku.trim(), brand: brand.trim(), category: category.trim(),
      sizes, colors
    };
  }

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const values = gatherValues();
      if (typeof onSave === "function") onSave(values, files);
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 12 }}>
        <div>
          <label style={{ display: "block", marginBottom: 6 }}>
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} required style={{ width: "100%", padding: 8, marginTop: 6 }} />
          </label>

          <label style={{ display: "block", marginBottom: 6 }}>
            Description
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} style={{ width: "100%", padding: 8, marginTop: 6 }} />
          </label>

          <div style={{ display: "flex", gap: 8 }}>
            <label style={{ flex: 1 }}>
              Price<br />
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} style={{ width: "100%", padding: 8 }} />
            </label>

            <label style={{ width: 160 }}>
              MRP<br />
              <input type="number" value={mrp} onChange={(e) => setMrp(e.target.value)} style={{ width: "100%", padding: 8 }} />
            </label>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <label style={{ width: 160 }}>
              Stock<br />
              <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} style={{ width: "100%", padding: 8 }} />
            </label>

            <label style={{ flex: 1 }}>
              SKU<br />
              <input value={sku} onChange={(e) => setSku(e.target.value)} style={{ width: "100%", padding: 8 }} />
            </label>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <label style={{ flex: 1 }}>
              Brand<br />
              <input value={brand} onChange={(e) => setBrand(e.target.value)} style={{ width: "100%", padding: 8 }} />
            </label>

            <label style={{ width: 200 }}>
              Category<br />
              <input value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: "100%", padding: 8 }} />
            </label>
          </div>

          <label style={{ display: "block", marginTop: 8 }}>
            Sizes (comma separated)<br />
            <input value={sizesText} onChange={(e) => setSizesText(e.target.value)} placeholder="S,M,L" style={{ width: "100%", padding: 8, marginTop: 6 }} />
          </label>

          <label style={{ display: "block", marginTop: 8 }}>
            Colors (comma separated)<br />
            <input value={colorsText} onChange={(e) => setColorsText(e.target.value)} placeholder="red,blue" style={{ width: "100%", padding: 8, marginTop: 6 }} />
          </label>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 8 }}>
            Upload images<br />
            <input type="file" accept="image/*" multiple onChange={handleFiles} />
          </label>

          {files.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div>Files to upload:</div>
              <ul>
                {files.map((f, i) => <li key={i}>{f.name} — {Math.round(f.size / 1024)} KB</li>)}
              </ul>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <button type="submit" disabled={saving} style={{ padding: "8px 16px", marginRight: 8 }}>{saving ? "Saving…" : "Save"}</button>
            <button type="button" onClick={() => { /* parent handles cancel/navigate */ }} style={{ padding: "8px 16px" }}>Cancel</button>
          </div>
        </div>
      </div>
    </form>
  );
}
