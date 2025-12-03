// src/admin/AdminPage.jsx
import React, { useEffect } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";

// Explicit imports — match exact file names (case & extension)
import AdminProductList from "./AdminProductList.jsx";
import AdminProductEdit from "./AdminProductEdit.jsx"; // make sure this exists (or .js)
import AdminProductAdd from "./AdminProductEdit.jsx";  // reuse edit page for add (if you want separate, change)
import AdminAnnouncements from "./AdminAnnouncements.jsx"; // optional admin subpage

/**
 * AdminPage
 * - Handles all /admin/* routes (mounted by App.js)
 * - Renders an admin sidebar/header and nested routes
 * - Adds debug logs so we can confirm which route mounted
 */
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
          <div style={{ fontSize: 13, color: "#666" }}>Manage products, announcements and site content.</div>
        </div>

        <div>
          <Link to="/" style={{ marginRight: 12 }}>Back to site</Link>
          <Link to="/admin/products" style={{ marginRight: 8 }}>Products</Link>
          <Link to="/admin/announcements">Announcements</Link>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 6, padding: 8 }}>
        <Routes>
          {/* Admin product list */}
          <Route path="products" element={<AdminProductList />} />
          {/* Add product (you can reuse same edit component) */}
          <Route path="products/add" element={<AdminProductAdd />} />
          {/* Edit product */}
          <Route path="products/:id/edit" element={<AdminProductEdit />} />

          {/* Other admin pages (optional) */}
          <Route path="announcements" element={<AdminAnnouncements />} />

          {/* Default admin route -> products list */}
          <Route path="" element={<AdminProductList />} />
        </Routes>
      </div>
    </div>
  );
}
