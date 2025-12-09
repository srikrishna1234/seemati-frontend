// src/admin/AdminPage.jsx
import React from "react";
import { Routes, Route, Link } from "react-router-dom";

import AdminProductList from "./AdminProductList";
import AdminProductEdit from "./AdminProductEdit";
import AddProduct from "./AddProduct";           // ✅ FIXED
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
          <Route path="products" element={<AdminProductList />} />

          {/* ✅ FIX: Use AddProduct instead of ProductForm */}
          <Route path="products/new" element={<AddProduct />} />

          <Route path="products/:id" element={<AdminProductEdit />} />
          <Route path="announcements" element={<AdminAnnouncements />} />

          {/* fallback */}
          <Route path="*" element={<AdminProductList />} />
        </Routes>
      </main>
    </div>
  );
}
