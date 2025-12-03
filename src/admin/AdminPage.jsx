// src/admin/AdminPage.jsx
import React, { useEffect } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";

// NOTE: import the actual filenames you have in your repo — .js for edit/announcements
import AdminProductList from "./AdminProductList.jsx";
import AdminProductEdit from "./AdminProductEdit.js";       // <- use .js (existing)
import AdminAnnouncements from "./AdminAnnouncements.js";  // <- use .js (existing)

/**
 * AdminPage.jsx
 * - Thin wrapper that sets up nested admin routes:
 *    /admin/products
 *    /admin/products/add
 *    /admin/products/:id/edit
 *    /admin/announcements
 *
 * Make sure the imported filenames above match real files in src/admin (case + extension).
 */
export default function AdminPage() {
  const loc = useLocation();

  useEffect(() => {
    console.debug("[AdminPage] mounted, location:", loc.pathname);
    return () => console.debug("[AdminPage] unmounted");
  }, [loc.pathname]);

  return (
    <main style={{ padding: 18 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
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
            {/* default admin landing -> product list */}
            <Route path="" element={<AdminProductList />} />
          </Routes>
        </div>
      </div>
    </main>
  );
}
