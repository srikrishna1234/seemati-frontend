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

// wishlist page
import WishlistPage from "./pages/WishlistPage";

// order success component (from the OTP checkout file)
import { OrderSuccess } from "./components/OtpCheckout";

// 🔑 new imports for auth
import OtpLogin from "./pages/OtpLogin"; // if your OtpLogin is in pages, change to "./pages/OtpLogin"
import { AuthProvider } from "./auth/AuthProvider";

// Cart provider
import { CartProvider } from "./context/CartContext";

/**
 * Inline PrivateRoute wrapper (keeps your current pattern of using
 * <PrivateRoute>...</PrivateRoute> around admin components).
 * This avoids changing many files — it checks for token in localStorage
 * and redirects to admin/login if not present.
 */
function PrivateRoute({ children }) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
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
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/wishlist" element={<WishlistPage />} />

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
            <Route
              path="/admin/products/add"
              element={
                <PrivateRoute>
                  <AddProduct />
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

            {/* fallback -> homepage */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
