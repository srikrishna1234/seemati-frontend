// src/admin/AdminPage.jsx
import React, { useEffect } from "react";
import AdminProductList from "./AdminProductList.jsx"; // exact filename (case-sensitive)
 
/**
 * AdminPage.jsx
 * - Thin wrapper page that renders AdminProductList.
 * - Adds console logs so we can confirm this page mounts the expected component.
 * - Use this full-file replacement to avoid ambiguous imports / wrong file being bundled.
 */
export default function AdminPage() {
  useEffect(() => {
    console.debug("[AdminPage] mounted");
    return () => console.debug("[AdminPage] unmounted");
  }, []);

  return (
    <main style={{ padding: 20 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0 }}>Admin</h1>
        </div>

        {/* Keep the AdminProductList import very explicit */}
        <section id="admin-products-section">
          <AdminProductList />
        </section>
      </div>
    </main>
  );
}
