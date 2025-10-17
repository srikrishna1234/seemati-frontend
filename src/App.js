// src/App.js
import React from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";

import Navbar from "./components/Navbar";

import ProductListPage from "./pages/ProductListPage";
import ProductDetail from "./pages/ProductDetail";
import CartPage from "./pages/CartPage";
import Checkout from "./pages/Checkout";

// admin imports
import AdminProductList from "./admin/AdminProductList";
import AddProduct from "./admin/AddProduct";
import AdminProductEdit from "./admin/AdminProductEdit";

// shop import (you added these files under src/shop)
import ShopProducts from "./shop/ShopProducts";

// wishlist page
import WishlistPage from "./pages/WishlistPage";

// order success component (from the OTP checkout file)
import { OrderSuccess } from "./components/OtpCheckout";

// 🔑 new imports for auth
import OtpLogin from "./pages/OtpLogin";
import { AuthProvider } from "./auth/AuthProvider";

// Cart provider
import { CartProvider } from "./context/CartContext";

/**
 * Inline PrivateRoute wrapper
 * Checks for token in localStorage/sessionStorage (token or adminToken).
 */
function PrivateRoute({ children }) {
  const token =
    (typeof window !== "undefined" && (
      localStorage.getItem("token") ||
      localStorage.getItem("adminToken") ||
      sessionStorage.getItem("token") ||
      sessionStorage.getItem("adminToken")
    )) || null;

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}

function OrderSuccessPage() {
  const { id } = useParams();
  return <OrderSuccess orderId={id} />;
}

function App() {
  return (
    // Provide auth context to the app
    <AuthProvider>
      {/* Provide cart context to everything that needs it */}
      <CartProvider>
        <Navbar />
        <div style={{ padding: 20 }}>
          <Routes>
            {/* public / customer pages */}
            <Route path="/" element={<ProductListPage />} />

            {/* Product detail: support both slug and id routes */}
            <Route path="/product/:slug" element={<ProductDetail />} />
            <Route path="/product/id/:id" element={<ProductDetail />} />

            {/* If someone hits /product without a param, send them to /shop */}
            <Route path="/product" element={<Navigate to="/shop" replace />} />

            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/wishlist" element={<WishlistPage />} />

            {/* Shop listing route */}
            <Route path="/shop" element={<ShopProducts />} />

            {/* order success */}
            <Route path="/order-success/:id" element={<OrderSuccessPage />} />

            {/* 🔑 admin login (public) */}
            <Route path="/admin/login" element={<OtpLogin />} />

            {/* 🔒 admin pages (protected) */}
            <Route
              path="/admin/products"
              element={
                <PrivateRoute>
                  <AdminProductList />
                </PrivateRoute>
              }
            />

            {/* Support both /admin/products/new and /admin/products/add */}
            <Route
              path="/admin/products/new"
              element={
                <PrivateRoute>
                  <AddProduct />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/products/add"
              element={
                <PrivateRoute>
                  <AddProduct />
                </PrivateRoute>
              }
            />

            {/* Support both /admin/products/:id/edit and /admin/products/edit/:id */}
            <Route
              path="/admin/products/:id/edit"
              element={
                <PrivateRoute>
                  <AdminProductEdit />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/products/edit/:id"
              element={
                <PrivateRoute>
                  <AdminProductEdit />
                </PrivateRoute>
              }
            />

            {/* fallback -> shop (user-friendly) */}
            <Route path="*" element={<Navigate to="/shop" replace />} />
          </Routes>
        </div>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
