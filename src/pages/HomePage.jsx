// src/pages/HomePage.jsx
import React, { useEffect, useState, Suspense, lazy } from "react";
import { Link } from "react-router-dom";
import "./HomePage.css";
import ShopProducts from "../shop/ShopProducts";

// lazy-load local home sections from src/home
const HomeBanners = lazy(() => import("../home/HomeBanners.jsx"));
const BrandStory = lazy(() => import("../home/BrandStory.jsx"));
const TestimonialsHome = lazy(() => import("../home/Testimonials.jsx"));
const InstagramFeed = lazy(() => import("../home/InstagramFeed.jsx"));
const NewsletterSignup = lazy(() => import("../home/NewsletterSignup.jsx"));
const WhySeemati = lazy(() => import("../home/WhySeemati.jsx"));

// hero images (public/images)
const heroImages = [
  "/images/hero.jpg",
  "/images/hero-1.jpg",
  "/images/hero-2.jpg",
  "/images/hero-3.jpg"
];

export default function HomePage() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex(i => (i + 1) % heroImages.length), 5000);
    return () => clearInterval(id);
  }, []);

  const prev = () => setIndex(i => (i - 1 + heroImages.length) % heroImages.length);
  const next = () => setIndex(i => (i + 1) % heroImages.length);

  return (
    <div className="home-page">
      {/* HERO IMAGE (no overlay text) */}
      <section className="hero-image-wrapper" aria-hidden="false">
        <div className="hero-image-inner">
          <img
            src={heroImages[index]}
            onError={(e) => { if (e.target.src !== heroImages[0]) e.target.src = heroImages[0]; }}
            alt="Seemati hero"
            className="hero-image"
          />
          <button className="hero-nav hero-prev" onClick={prev} aria-label="Previous">‹</button>
          <button className="hero-nav hero-next" onClick={next} aria-label="Next">›</button>
        </div>
        <div className="hero-dots" aria-hidden="true">
          {heroImages.map((_, i) => (
            <button
              key={i}
              className={`dot ${i === index ? "active" : ""}`}
              onClick={() => setIndex(i)}
              aria-label={`Show hero ${i + 1}`}
            />
          ))}
        </div>
      </section>

      {/* HERO CONTENT — BELOW IMAGE */}
      <section className="hero-content-below" role="region" aria-label="Brand message">
        <div className="hero-content-inner">
          <h1>Seemati — Confident &amp; Stylish</h1>
          <p className="lead">Comfort-first kurti pants and palazzos — made for everyday wear.</p>

          <div className="cta-row">
  <Link to="/shop?category=kurti-pants" className="btn btn-primary">
    Kurti Pants
  </Link>

  <Link to="/shop?category=palazzos" className="btn btn-primary">
    Palazzos
  </Link>

  <Link to="/shop?category=leggings" className="btn btn-primary">
    Leggings
  </Link>

  <Link to="/shop" className="btn btn-ghost">
    Browse all
  </Link>
</div>


        </div>
      </section>

      {/* Home banners (promos) */}
      <Suspense fallback={<div style={{padding:24}}>Loading banners…</div>}>
        <HomeBanners />
      </Suspense>
       {/* SEO: Organization + Website Schema */}
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: `
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Seemati",
  "url": "https://seemati.in",
  "logo": "https://seemati.in/logo.png",
  "brand": "Seemati",
  "description": "Comfort-first kurti pants, leggings, palazzos and everyday wear manufactured by Sri Krishna Apparells.",
  "founder": "Sri Krishna Apparells",
  "sameAs": [
    "https://www.facebook.com/",
    "https://www.instagram.com/",
    "https://www.youtube.com/"
  ]
}
`
  }}
/>

<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: `
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Seemati",
  "url": "https://seemati.in",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://seemati.in/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
`
  }}
/>

      <main style={{ padding: "2.5rem 1rem 6rem", maxWidth: 1200, margin: "0 auto" }}>
        {/* Brand story */}
        <Suspense fallback={<div style={{padding:24}}>Loading brand story…</div>}>
          <BrandStory />
        </Suspense>

        {/* Featured products */}
        <section style={{ marginBottom: 32 }}>
          <h2>Featured Products</h2>
          <div style={{ marginTop: 12 }}>
            <ShopProducts preview={true} limit={8} />
          </div>
        </section>

        {/* Why Seemati (USPs) */}
        <Suspense fallback={<div style={{padding:24}}>Loading features…</div>}>
          <WhySeemati />
        </Suspense>

        {/* Testimonials / reviews */}
        <section style={{ marginBottom: 32 }}>
          <h2>What customers say</h2>
          <Suspense fallback={<div style={{padding:24}}>Loading reviews…</div>}>
            <TestimonialsHome />
          </Suspense>
          <div style={{ marginTop: 12 }}>
            <Link to="/testimonials" className="link">Read more testimonials</Link>
          </div>
        </section>

        {/* Instagram / social feed */}
        <Suspense fallback={<div style={{padding:24}}>Loading Instagram…</div>}>
          <InstagramFeed />
        </Suspense>

        {/* Newsletter signup */}
        <Suspense fallback={<div style={{padding:24}}>Loading signup…</div>}>
          <NewsletterSignup />
        </Suspense>
      </main>
    </div>
  );
}
