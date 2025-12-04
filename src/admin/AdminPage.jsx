// src/admin/AdminPage.jsx
// Full replacement: AdminPage wrapper that ensures /admin/login renders the OtpLogin page.
// Keeps current admin header/footer and renders children via Outlet for other admin routes.

import React, { useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import OtpLogin from "../pages/OtpLogin.jsx";

/**
 * AdminPage
 * - Renders common admin shell (header/nav/footer)
 * - If location is exactly '/admin/login' it renders OtpLogin (ensures form always appears)
 * - Otherwise renders nested admin routes via <Outlet />
 */

export default function AdminPage() {
  const loc = useLocation();

  useEffect(() => {
    console.debug("[AdminPage] mounted, location:", loc.pathname);
    return () => console.debug("[AdminPage] unmounted");
  }, [loc.pathname]);

  // When user is visiting the admin login path, render the OtpLogin page directly.
  if (loc.pathname === "/admin/login" || loc.pathname === "/admin/login/") {
    return (
      <div style={{ padding: 20 }}>
        {/* Minimal header to match admin shell */}
        <div style={{ marginBottom: 18 }}>
          <Link to="/" style={{ textDecoration: "none", color: "#222", fontWeight: "600" }}>
            ← Back to site
          </Link>
        </div>

        <h1 style={{ marginBottom: 6 }}>Admin</h1>
        <div style={{ color: "#666", marginBottom: 18 }}>Manage products and site content</div>

        {/* The actual login form */}
        <div>
          <OtpLogin />
        </div>

        {/* small footer spacer */}
        <div style={{ marginTop: 30, color: "#999", fontSize: 13 }}>
          If you have issues logging in, check server logs or contact the developer.
        </div>
      </div>
    );
  }

  // Default admin shell for other routes (products, announcements, etc.)
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
        {/* Outlet will render nested admin routes (product list, edit forms, etc.) */}
        <Outlet />
      </main>

      <footer style={{ marginTop: 30, color: "#777", fontSize: 13 }}>
        <div>Seemati Admin</div>
      </footer>
    </div>
  );
}
