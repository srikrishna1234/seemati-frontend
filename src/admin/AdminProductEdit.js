// frontend/src/admin/AdminProductEdit.js
import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "../api/axiosInstance";

export default function AdminProductEdit() {
  const { id } = useParams(); // /admin/products/edit/:id
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState(null);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    price: "",
    mrp: "",
    description: "",
    imagesCSV: "", // comma-separated URLs
  });
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    let mounted = true;
    async function fetchProduct() {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get(`/api/products/${id}`);
        const p = res.data && (res.data.product || res.data);
        if (!mounted) return;
        setProduct(p);
        setForm({
          title: p.title || "",
          slug: p.slug || "",
          price: p.price != null ? String(p.price) : "",
          mrp: p.mrp != null ? String(p.mrp) : "",
          description: p.description || "",
          imagesCSV: Array.isArray(p.images)
            ? p.images.map((i) => (typeof i === "string" ? i : i.url || "")).filter(Boolean).join(",")
            : "",
        });
      } catch (err) {
        console.error("AdminProductEdit fetch error:", err);
        if (mounted) {
          setError(err.response?.data?.message || err.message || "Failed to load product");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchProduct();
    return () => (mounted = false);
  }, [id]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg("");
    try {
      // prepare payload
      const payload = {
        title: form.title,
        slug: form.slug,
        price: form.price === "" ? null : Number(form.price),
        mrp: form.mrp === "" ? null : Number(form.mrp),
        description: form.description,
        images: form.imagesCSV
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((u) => ({ url: u })),
      };

      const res = await axios.put(`/api/products/${id}`, payload);
      const updated = res.data && (res.data.product || res.data);
      setProduct(updated);
      setSuccessMsg("Product updated successfully.");
      // update form values to normalized data
      setForm((f) => ({
        ...f,
        imagesCSV:
          updated &&
          Array.isArray(updated.images) &&
          updated.images.map((i) => (typeof i === "string" ? i : i.url || "")).filter(Boolean).join(","),
      }));
    } catch (err) {
      console.error("Update failed:", err);
      setError(err.response?.data?.message || err.message || "Update failed");
    } finally {
      setSaving(false);
    }
  }

  const handleDelete = async () => {
    try {
      const ok = window.confirm("Delete product permanently?");
      if (!ok) return;
      await axios.delete(`/api/products/${id}`);
      alert("Deleted. Returning to products...");
      navigate("/admin/products");
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Delete failed: " + (err.response?.data?.message || err.message));
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Loading product…</h2>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div style={{ padding: 20 }}>
        <h2 style={{ color: "red" }}>Error: {error}</h2>
        <p>
          <Link to="/admin/products">Back to products</Link>
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Edit product — {product?.title || "—"}</h2>
      <div style={{ marginBottom: 12 }}>
        <button onClick={() => navigate("/admin/products")} style={{ marginRight: 8 }}>
          Back to products
        </button>
        <button onClick={handleDelete} style={{ marginRight: 8 }}>
          Delete
        </button>
      </div>

      <form onSubmit={onSubmit} style={{ maxWidth: 880 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ display: "block", marginBottom: 6 }}>
              Title
              <input name="title" value={form.title} onChange={onChange} style={{ width: "100%", padding: 8, marginTop: 6 }} />
            </label>

            <label style={{ display: "block", marginBottom: 6 }}>
              Slug
              <input name="slug" value={form.slug} onChange={onChange} style={{ width: "100%", padding: 8, marginTop: 6 }} />
            </label>

            <label style={{ display: "block", marginBottom: 6 }}>
              Price (₹)
              <input name="price" value={form.price} onChange={onChange} style={{ width: "100%", padding: 8, marginTop: 6 }} />
            </label>

            <label style={{ display: "block", marginBottom: 6 }}>
              MRP (₹)
              <input name="mrp" value={form.mrp} onChange={onChange} style={{ width: "100%", padding: 8, marginTop: 6 }} />
            </label>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 6 }}>
              Images (comma-separated URLs)
              <textarea name="imagesCSV" value={form.imagesCSV} onChange={onChange} rows={6} style={{ width: "100%", padding: 8, marginTop: 6 }} />
            </label>

            <label style={{ display: "block", marginBottom: 6 }}>
              Description
              <textarea name="description" value={form.description} onChange={onChange} rows={6} style={{ width: "100%", padding: 8, marginTop: 6 }} />
            </label>
          </div>
        </div>

        {successMsg && <div style={{ marginTop: 12, color: "green" }}>{successMsg}</div>}
        {error && <div style={{ marginTop: 12, color: "red" }}>Error: {error}</div>}

        <div style={{ marginTop: 14 }}>
          <button type="submit" disabled={saving} style={{ marginRight: 8 }}>
            {saving ? "Saving..." : "Save changes"}
          </button>
          <button type="button" onClick={() => navigate("/admin/products")}>
            Done
          </button>
        </div>
      </form>
    </div>
  );
}
