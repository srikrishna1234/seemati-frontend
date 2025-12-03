// src/admin/AdminPage.jsx
import React, { useEffect } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";

import AdminProductList from "./AdminProductList.jsx";
import AdminProductEdit from "./AdminProductEdit.jsx"; // ensure this file exists (or change to .js)
import AdminAnnouncements from "./AdminAnnouncements.jsx"; // optional

export default function AdminPage() {
  const loc = useLocation();

  useEffect(() => {
    console.debug("[AdminPage] mounted, location:", loc.pathname);
    return () => console.debug("[AdminPage] unmounted");
  }, [loc.pathname]);

  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <h1 style={{ margin: 0 }}>Admin</h1>
          <div style={{ fontSize: 13, color: "#666" }}>Manage products and site content</div>
        </div>

        <div>
          <Link to="/" style={{ marginRight: 12 }}>Back to site</Link>
          <Link to="/admin/products" style={{ marginRight: 8 }}>Products</Link>
          <Link to="/admin/announcements">Announcements</Link>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 6, padding: 8 }}>
        <Routes>
          <Route path="products" element={<AdminProductList />} />
          <Route path="products/add" element={<AdminProductEdit />} />
          <Route path="products/:id/edit" element={<AdminProductEdit />} />
          <Route path="announcements" element={<AdminAnnouncements />} />
          <Route path="" element={<AdminProductList />} />
        </Routes>
      </div>
    </div>
  );
}
