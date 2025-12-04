// src/App.js
import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import CookieConsent from "./components/CookieConsent";
import "./components/CookieConsent.css";

// Lazy-loaded pages
const HomePage = lazy(() => import("./pages/HomePage"));
const Home = lazy(() => import("./pages/Home"));
const ProductListPage = lazy(() => import("./pages/ProductListPage"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const CartPage = lazy(() => import("./pages/CartPage"));
const Checkout = lazy(() => import("./pages/Checkout"));
const ShippingPage = lazy(() => import("./pages/ShippingPage"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const SizeGuide = lazy(() => import("./pages/SizeGuide"));
const Terms = lazy(() => import("./pages/Terms"));
const FAQ = lazy(() => import("./pages/FAQ"));
const BecomeDistributor = lazy(() => import("./pages/BecomeDistributor"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const Reviews = lazy(() => import("./pages/Reviews"));
const Returns = lazy(() => import("./pages/Returns"));
const Testimonials = lazy(() => import("./pages/Testimonials"));
const WishlistPage = lazy(() => import("./pages/WishlistPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Admin area (parent) and admin children
const AdminPage = lazy(() => import("./admin/AdminPage"));
const AdminProductList = lazy(() => import("./admin/AdminProductList.js"));
const AdminProductEdit = lazy(() => import("./admin/AdminProductEdit.js"));
const AddProduct = lazy(() => import("./admin/AddProduct.js"));

// Admin login (OTP)
const OtpLogin = lazy(() => import("./pages/OtpLogin"));

function App() {
  return (
    <div className="app-root">
      <Navbar />

      <main>
        <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>Loading…</div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/home" element={<Home />} />
            <Route path="/shop" element={<ProductListPage />} />
            <Route path="/products" element={<ProductListPage />} />
            <Route path="/product/:slug" element={<ProductDetail />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/shipping" element={<ShippingPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/size-guide" element={<SizeGuide />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/distributor" element={<BecomeDistributor />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/returns" element={<Returns />} />
            <Route path="/testimonials" element={<Testimonials />} />
            <Route path="/wishlist" element={<WishlistPage />} />

            {/* ---------- ADMIN (nested routes) ---------- */}
            <Route path="/admin" element={<AdminPage />}>
              {/* default /admin -> redirect to products */}
              <Route index element={<Navigate to="products" replace />} />
              {/* admin login */}
              <Route path="login" element={<OtpLogin />} />
              {/* /admin/products */}
              <Route path="products" element={<AdminProductList />} />
              {/* /admin/products/add */}
              <Route path="products/add" element={<AddProduct />} />
              {/* /admin/products/:id */}
              <Route path="products/:id" element={<AdminProductEdit />} />
              {/* add more nested admin routes here as needed */}
            </Route>

            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </Suspense>
      </main>

      <Footer />
      <CookieConsent />
    </div>
  );
}

export default App;
