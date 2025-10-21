// src/App.js
import React, { createContext, useContext } from "react";
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
 * ApiConfigContext
 * Provides:
 *  - apiBase: the backend base URL from REACT_APP_API_URL
 *  - resolveImageUrl(url): resolves relative or localhost image paths to the backend host
 *
 * Usage in other components:
 *  const { apiBase, resolveImageUrl } = useApiConfig();
 *  fetch(`${apiBase}/products`)      // correct endpoint
 *  <img src={resolveImageUrl(img.url)} />
 */
const ApiConfigContext = createContext({
  apiBase: process.env.REACT_APP_API_URL || "",
  resolveImageUrl: (u) => u,
});

export function useApiConfig() {
  return useContext(ApiConfigContext);
}

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
  // read base from env (set this in Vercel settings as REACT_APP_API_URL)
  const apiBase = process.env.REACT_APP_API_URL || "";

  /**
   * resolveImageUrl:
   * - if url is absolute and includes 'localhost', replace host with apiBase
   * - if url is relative (starts with '/'), prepend apiBase
   * - otherwise return url unchanged
   */
  const resolveImageUrl = (url) => {
    if (!url) return "";
    try {
      // If it's an absolute URL
      if (/^https?:\/\//i.test(url)) {
        // replace localhost host (dev uploads) with deployed backend host
        if (url.includes("localhost") && apiBase) {
          // keep path after host
          const pathPart = url.replace(/^https?:\/\/[^/]+/, "");
          return `${apiBase}${pathPart}`;
        }
        return url;
      }
      // If it's a relative path like /uploads/xxxxx
      if (url.startsWith("/")) {
        return apiBase ? `${apiBase}${url}` : url;
      }
      // fallback (could be just a filename)
      return apiBase ? `${apiBase}/${url}` : url;
    } catch (err) {
      return url;
    }
  };

  const providerValue = {
    apiBase,
    resolveImageUrl,
  };

  return (
    <ApiConfigContext.Provider value={providerValue}>
      {/* Provide auth context to the app */}
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
    </ApiConfigContext.Provider>
  );
}

export default App;
