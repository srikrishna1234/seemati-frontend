// src/admin/AdminPage.jsx
import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import AdminProductList from "./AdminProductList";
import AdminProductEdit from "./AdminProductEdit";
import ProductForm from "./ProductForm.jsx"; // adjust path/name if your add/edit form filename differs
import AdminAnnouncements from "./AdminAnnouncements";

export default function AdminPage() {
  console.debug("[AdminPage] mounted, location:", window.location.pathname);

  return (
    <div>
      <header style={{ padding: 20, borderBottom: "1px solid #eee" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ margin: 0 }}>Admin</h1>
          <nav>
            <Link to="/admin/products" style={{ marginRight: 12 }}>Products</Link>
            <Link to="/admin/announcements" style={{ marginRight: 12 }}>Announcements</Link>
            <Link to="/">Back to site</Link>
          </nav>
        </div>
      </header>

      <main style={{ padding: 20 }}>
        <Routes>
          {/* Explicitly mount the debug-ready AdminProductList */}
          <Route path="products" element={<AdminProductList />} />
          <Route path="products/new" element={<ProductForm />} />
          <Route path="products/:id" element={<AdminProductEdit />} />
          <Route path="announcements" element={<AdminAnnouncements />} />
          {/* Fallback — render product list for any other admin path */}
          <Route path="*" element={<AdminProductList />} />
        </Routes>
      </main>
    </div>
  );
}
