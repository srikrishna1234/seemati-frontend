// src/App.js
import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { OrderSuccess } from "./components/OtpCheckout";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import CookieConsent from "./components/CookieConsent";
import "./components/CookieConsent.css";

// Pages
const HomePage = lazy(() => import("./pages/HomePage"));
const Home = lazy(() => import("./pages/Home"));
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

// ✅ SHOP PAGE WITH SEARCH
const ShopProducts = lazy(() => import("./shop/ShopProducts"));

// Admin
const AdminPage = lazy(() => import("./admin/AdminPage"));


function OrderSuccessWrapper() {
  const { orderId } = useParams();
  return <OrderSuccess orderId={orderId} />;
}

function App() {
  return (
    <div className="app-root">
      <Navbar />

      <main>
        <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>Loading…</div>}>
          <Routes>
            {/* Public pages */}
            <Route path="/" element={<HomePage />} />
            <Route path="/home" element={<Home />} />

            {/* ✅ SHOP ROUTE (SEARCH LIVES HERE) */}
            <Route path="/shop" element={<ShopProducts />} />

            {/* ❌ PRODUCTS ROUTE → REDIRECT */}
            <Route path="/products" element={<Navigate to="/shop" replace />} />

            <Route path="/product/:slug" element={<ProductDetail />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<Checkout />} />
			<Route path="/order-success/:orderId" element={<OrderSuccessWrapper />} />

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

            {/* Admin */}
            <Route path="/admin/*" element={<AdminPage />} />

            {/* 404 */}
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
