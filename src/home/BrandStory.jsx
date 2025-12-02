// src/home/BrandStory.jsx
import React from "react";

/**
 * BrandStory.jsx
 *
 * - Compact brand story section with headline, short paragraph, image (optional), and CTA to /about
 * - Responsive layout: image right on desktop, stacked on mobile
 * - Inline styles so you can paste directly
 *
 * Usage:
 *  import BrandStory from "../home/BrandStory";
 *  <BrandStory />
 *
 * Place after Testimonials (or wherever you prefer).
 */

export default function BrandStory({ className = "" }) {
  return (
    <section
      aria-labelledby="seemati-brandstory-title"
      className={`seemati-brandstory ${className}`}
      style={root}
    >
      <div style={inner}>
        <div style={content}>
          <div style={left}>
            <h2 id="seemati-brandstory-title" style={title}>
              Seemati — Confident, Comfortable, Crafted for Everyday
            </h2>

            <p style={lead}>
              The Seemati Idea

Every woman deserves to feel confident, stylish, and comfortable — not occasionally, but every single day.
Seemati was born from a simple observation:
Most “everyday” women’s bottoms look stylish OR feel comfortable — rarely both.

We wanted to fix that.

What Seemati Stands For

Effortless confidence

Premium fabrics that breathe & move

Everyday pricing without sacrificing quality

Flattering fits designed for Indian body shapes

Seemati is not just apparel — it’s a daily essential.
Your kurti pants and palazzos should feel as trustworthy as your favourite routine.

Our Promise

Whether it’s work, travel, shopping, or celebrations…
Seemati keeps you comfortable, confident, and photo-ready every moment.
            </p>

            <ul style={list}>
              <li><strong>Comfort-first fits</strong> — relaxed waists, flattering drape.</li>
              <li><strong>Quality fabrics</strong> — breathable cotton blends, soft finishes.</li>
              <li><strong>Everyday style</strong> — versatile pieces that pair easily.</li>
            </ul>

            <div style={{ marginTop: 16 }}>
              <a href="/about" style={cta}>Learn our story</a>
            </div>
          </div>

          <div style={right} aria-hidden>
            {/* Optional decorative image — replace src with your brand photo or remove */}
            <div style={imageWrapper}>
              <img
                alt="Seemati brand story"
                src="/images/banner.jpg"
                style={image}
                onError={(e) => {
                  // fail gracefully if image not present
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------
   Inline styles
   -------------------- */
const root = {
  padding: "36px 12px",
  background: "#fff",
  color: "#111",
};

const inner = {
  maxWidth: 1100,
  margin: "0 auto",
};

const content = {
  display: "flex",
  gap: 24,
  alignItems: "center",
  flexWrap: "wrap",
};

const left = {
  flex: "1 1 420px",
  minWidth: 280,
};

const right = {
  flex: "0 0 360px",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minWidth: 260,
};

const title = {
  fontSize: 22,
  margin: 0,
  lineHeight: 1.15,
};

const lead = {
  marginTop: 12,
  fontSize: 15,
  color: "#333",
  lineHeight: 1.5,
};

const list = {
  marginTop: 12,
  paddingLeft: 20,
  color: "#444",
  fontSize: 14,
};

const cta = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 8,
  background: "#0b6eff",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 600,
};

const imageWrapper = {
  width: "100%",
  maxWidth: 340,
  borderRadius: 10,
  overflow: "hidden",
  boxShadow: "0 6px 22px rgba(10,10,10,0.08)",
};

const image = {
  width: "100%",
  height: "auto",
  display: "block",
  objectFit: "cover",
};
