// src/admin/AddProduct.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosInstance"; // <- now guaranteed to be the configured axios

const AddProduct = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    mrp: "",
    stock: "",
    brand: "",
    category: "",
    colors: "",
    sizes: "",
  });
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files || []));
  };

  const handleRemoveFile = (index) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      // 1) Upload images first (if any)
      let uploadedImages = [];
      if (files.length > 0) {
        setUploading(true);
        for (const file of files) {
          const fd = new FormData();
          fd.append("file", file);

          // IMPORTANT: do NOT set Content-Type manually when sending FormData.
          // Use the configured axios instance (it will add Authorization header).
          const res = await api.post("/admin-api/products/upload", fd);

          if (res.data?.ok && res.data?.url) {
            uploadedImages.push({
              filename: res.data.filename,
              url: res.data.url,
            });
          } else {
            throw new Error(res?.data?.message || "Upload failed");
          }
        }
        setUploading(false);
      }

      // 2) prepare payload
      const payload = {
        title: form.title || "",
        description: form.description || "",
        price: form.price ? Number(form.price) : 0,
        mrp: form.mrp ? Number(form.mrp) : undefined,
        stock: form.stock ? Number(form.stock) : 0,
        brand: form.brand || "",
        category: form.category || "",
        colors: form.colors ? form.colors.split(",").map((c) => c.trim()).filter(Boolean) : [],
        sizes: form.sizes ? form.sizes.split(",").map((s) => s.trim()).filter(Boolean) : [],
        images: uploadedImages,
        // NOTE: do not send slug from client — let server generate and ensure uniqueness
      };

      // 3) create product
      const res = await api.post("/admin-api/products", payload);

      if (res.data?.ok || res.status === 201 || res.status === 200) {
        setSuccess("Product created successfully!");
        setTimeout(() => navigate("/admin/products"), 900);
      } else {
        // If server returns JSON with keyValue (duplicate), prefer that info
        throw new Error(res?.data?.message || "Create failed");
      }
    } catch (err) {
      console.error("Failed to create:", err);
      // If axios error with response, show server message and any keyValue
      const serverMsg = err?.response?.data;
      if (serverMsg) {
        if (serverMsg.keyValue) {
          setError(`${serverMsg.message} — duplicate: ${JSON.stringify(serverMsg.keyValue)}`);
        } else {
          setError(serverMsg.message || JSON.stringify(serverMsg));
        }
      } else {
        setError(err.message || "Failed to create");
      }
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-semibold mb-4">Add New Product</h2>

      <form onSubmit={handleSubmit}>
        <label className="block mb-2">Product Title</label>
        <input type="text" name="title" value={form.title} onChange={handleChange} className="w-full border p-2 mb-3 rounded" required />

        <label className="block mb-2">Description</label>
        <textarea name="description" value={form.description} onChange={handleChange} className="w-full border p-2 mb-3 rounded" rows="3" />

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block mb-2">Price (₹)</label>
            <input type="number" name="price" value={form.price} onChange={handleChange} className="w-full border p-2 rounded" required />
          </div>
          <div>
            <label className="block mb-2">MRP (₹)</label>
            <input type="number" name="mrp" value={form.mrp} onChange={handleChange} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block mb-2">Stock Quantity</label>
            <input type="number" name="stock" value={form.stock} onChange={handleChange} className="w-full border p-2 rounded" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="block mb-2">Brand</label>
            <input type="text" name="brand" value={form.brand} onChange={handleChange} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block mb-2">Category</label>
            <input type="text" name="category" value={form.category} onChange={handleChange} className="w-full border p-2 rounded" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="block mb-2">Colors (comma separated)</label>
            <input type="text" name="colors" value={form.colors} onChange={handleChange} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block mb-2">Sizes (comma separated)</label>
            <input type="text" name="sizes" value={form.sizes} onChange={handleChange} className="w-full border p-2 rounded" />
          </div>
        </div>

        <div className="mt-4">
          <label className="block mb-2">Images (select one or more)</label>
          <input type="file" multiple onChange={handleFileChange} />
          {files.length > 0 && (
            <div className="mt-3">
              {files.map((f, i) => (
                <div key={i} className="mb-2">
                  <img src={URL.createObjectURL(f)} alt="preview" className="h-32 object-cover rounded" />
                  <button type="button" onClick={() => handleRemoveFile(i)} className="bg-red-500 text-white text-sm px-2 py-1 mt-1 rounded">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-5">
          <button type="submit" disabled={saving || uploading} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:opacity-70">
            {saving || uploading ? "Saving..." : "Create Product"}
          </button>
          <button type="button" onClick={() => navigate("/admin/products")} className="bg-gray-200 px-4 py-2 rounded">
            Cancel
          </button>
        </div>

        {error && <div className="mt-3 text-red-600">❌ {error}</div>}
        {success && <div className="mt-3 text-green-600">✅ {success}</div>}
      </form>
    </div>
  );
};

export default AddProduct;
