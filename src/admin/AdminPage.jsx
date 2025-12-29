// src/admin/AdminPage.jsx
import React from "react";
import { Routes, Route, Link } from "react-router-dom";

import AdminLogin from "./AdminLogin";                 // ✅ Correct case
import AdminProductList from "./AdminProductList";
import AdminProductEdit from "./AdminProductEdit";
import AddProduct from "./AddProduct";
import AdminAnnouncements from "./AdminAnnouncements";
import AdminOrders from "./AdminOrders";
import AdminOrderDetail from "./AdminOrderDetail";

export default function AdminPage() {
  return (
    <div>
      <header style={{ padding: 20, borderBottom: "1px solid #eee" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ margin: 0 }}>Admin</h1>

          <nav>
            <Link to="/admin/login" style={{ marginRight: 12 }}>Login</Link>
            <Link to="/admin/products" style={{ marginRight: 12 }}>Products</Link>
            <Link to="/admin/announcements" style={{ marginRight: 12 }}>Announcements</Link>
            <Link to="/">Back to site</Link>
          </nav>
        </div>
      </header>

      <main style={{ padding: 20 }}>
        <Routes>
		  <Route path="orders" element={<AdminOrders />} />
		  <Route path="orders/:id" element={<AdminOrderDetail />} />

          {/* LOGIN PAGE */}
          <Route path="login" element={<AdminLogin />} />

          {/* PRODUCTS */}
          <Route path="products" element={<AdminProductList />} />
          <Route path="products/new" element={<AddProduct />} />
          <Route path="products/:id" element={<AdminProductEdit />} />
          

          {/* ANNOUNCEMENTS */}
          <Route path="announcements" element={<AdminAnnouncements />} />

          {/* DEFAULT → Login */}
          <Route path="*" element={<AdminOrders />} />
        </Routes>
      </main>
    </div>
  );
}
