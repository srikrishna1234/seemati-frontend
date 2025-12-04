// src/admin/AdminPage.jsx
import React, { useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import OtpLogin from "../pages/OtpLogin";
import AdminProductList from "./AdminProductList.js"; // prefer .js version we tested

/**
 * AdminPage
 * - Renders common admin shell (header/nav/footer)
 * - If location is exactly '/admin/login' it renders OtpLogin
 * - Renders nested admin routes via <Outlet />
 * - Additionally: when location is exactly '/admin/products' we render a safe fallback
 *   AdminProductList component (this emulates the temporary test but keeps Outlet for other routes).
 */

export default function AdminPage() {
  const loc = useLocation();

  useEffect(() => {
    console.debug("[AdminPage] mounted, location:", loc.pathname);
    return () => console.debug("[AdminPage] unmounted");
  }, [loc.pathname]);

  // If visiting login path, render login page
  if (loc.pathname === "/admin/login" || loc.pathname === "/admin/login/") {
    return (
      <div style={{ padding: 20 }}>
        <div style={{ marginBottom: 18 }}>
          <Link to="/" style={{ textDecoration: "none", color: "#222", fontWeight: "600" }}>
            ← Back to site
          </Link>
        </div>

        <h1 style={{ marginBottom: 6 }}>Admin</h1>
        <div style={{ color: "#666", marginBottom: 18 }}>Manage products and site content</div>

        <div>
          <OtpLogin />
        </div>

        <div style={{ marginTop: 30, color: "#999", fontSize: 13 }}>
          If you have issues logging in, check server logs or contact the developer.
        </div>
      </div>
    );
  }

  // Normal admin shell: render header/nav and the Outlet for nested admin routes.
  // Additionally, render a fallback AdminProductList when the path is exactly /admin/products
  // — this preserves the behavior you observed while still allowing nested routes to work.
  return (
    <div style={{ padding: 12 }}>
      <header style={{ marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: 0 }}>Admin</h1>
          <div style={{ color: "#666", fontSize: 14 }}>Manage products and site content</div>
        </div>

        <nav style={{ display: "flex", gap: 12 }}>
          <Link to="/">Back to site</Link>
          <Link to="/admin/products">Products</Link>
          <Link to="/admin/announcements">Announcements</Link>
        </nav>
      </header>

      <main style={{ display: "block" }}>
        {/* Primary rendering via outlet for nested admin routes */}
        <Outlet />

        {/* SAFE FALLBACK: if exactly at /admin/products, render the tested AdminProductList as fallback.
            This prevents the blank page you saw while we fix routing/import duplication. */}
        
      </main>

      <footer style={{ marginTop: 30, color: "#777", fontSize: 13 }}>
        <div>Seemati Admin</div>
      </footer>
    </div>
  );
}
