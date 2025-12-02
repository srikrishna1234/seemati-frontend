// src/App.js
import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import CookieConsent from "./components/CookieConsent";
import "./components/CookieConsent.css"; // ensure your cookie CSS is loaded

// Lazy-loaded pages (names based on your src/pages folder screenshots)
const HomePage = lazy(() => import("./pages/HomePage"));            // HomePage.jsx
const Home = lazy(() => import("./pages/Home"));                    // Home.jsx
const ProductListPage = lazy(() => import("./pages/ProductListPage")); // ProductListPage.jsx
const ProductDetail = lazy(() => import("./pages/ProductDetail"));  // ProductDetail.jsx
const CartPage = lazy(() => import("./pages/CartPage"));            // CartPage.jsx
const Checkout = lazy(() => import("./pages/Checkout"));            // Checkout.jsx
const ShippingPage = lazy(() => import("./pages/ShippingPage"));    // ShippingPage.jsx
const Shipping = lazy(() => import("./pages/Shipping"));            // Shipping.jsx (if used)
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));  // PrivacyPolicy.jsx
const SizeGuide = lazy(() => import("./pages/SizeGuide"));          // SizeGuide.jsx
const Terms = lazy(() => import("./pages/Terms"));                 // Terms.jsx
const FAQ = lazy(() => import("./pages/FAQ"));                     // FAQ.jsx
const BecomeDistributor = lazy(() => import("./pages/BecomeDistributor")); // BecomeDistributor.jsx
const AboutPage = lazy(() => import("./pages/AboutPage"));         // AboutPage.jsx
const ContactPage = lazy(() => import("./pages/ContactPage"));     // ContactPage.jsx
const Contact = lazy(() => import("./pages/Contact"));             // Contact.jsx (if used)
const Reviews = lazy(() => import("./pages/Reviews"));             // Reviews.jsx
const Returns = lazy(() => import("./pages/Returns"));             // Returns.jsx
const Testimonials = lazy(() => import("./pages/Testimonials"));   // Testimonials.jsx
const WishlistPage = lazy(() => import("./pages/WishlistPage"));   // WishlistPage.jsx
const NotFound = lazy(() => import("./pages/NotFound"));           // NotFound.jsx

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

            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </Suspense>
      </main>

      <Footer />

      {/* Cookie consent component (banner + manage modal). */}
      <CookieConsent />
    </div>
  );
}

export default App;
