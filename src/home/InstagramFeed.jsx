// src/home/InstagramFeed.jsx
import React from "react";

/**
 * InstagramFeed.jsx
 *
 * - Responsive static Instagram-like grid (initially static images)
 * - Replace the `samplePosts` image URLs with your Instagram image URLs (hosted in /public/images or CDN)
 * - Props:
 *    - columns: optional override for columns (ignored on very small screens)
 *    - showFollowBtn: boolean to show a Follow CTA
 *    - instaUrl: URL to your Instagram profile (defaults to "https://instagram.com/seemati")
 *
 * Usage:
 *   import InstagramFeed from "../home/InstagramFeed";
 *   <InstagramFeed showFollowBtn instaUrl="https://instagram.com/yourprofile" />
 *
 * Notes:
 *  - Later we can wire this to fetch from your backend that proxies Instagram media (recommended due to CORS/auth).
 *  - For now, host images under /public/images/insta1.jpg etc and update samplePosts below.
 */

const samplePosts = [
  {
    id: "p1",
    img: "/images/insta1.jpg",
    alt: "Seemati — kurti pant outfit on model",
    link: "https://instagram.com/p/placeholder1",
  },
  {
    id: "p2",
    img: "/images/insta2.jpg",
    alt: "Seemati fabric closeup",
    link: "https://instagram.com/p/placeholder2",
  },
  {
    id: "p3",
    img: "/images/insta3.jpg",
    alt: "Seemati palazzo day look",
    link: "https://instagram.com/p/placeholder3",
  },
  {
    id: "p4",
    img: "/images/insta4.jpg",
    alt: "Seemati kurti pant pairings",
    link: "https://instagram.com/p/placeholder4",
  },
  {
    id: "p5",
    img: "/images/insta5.jpg",
    alt: "Seemati customer photo",
    link: "https://instagram.com/p/placeholder5",
  },
  {
    id: "p6",
    img: "/images/insta6.jpg",
    alt: "Seemati behind-the-scenes",
    link: "https://instagram.com/p/placeholder6",
  },
  // add more as needed
];

export default function InstagramFeed({
  posts = samplePosts,
  columns = undefined,
  showFollowBtn = true,
  instaUrl = "https://instagram.com/seemati",
  className = "",
}) {
  // decide columns by CSS + optional override
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: columns
      ? `repeat(${columns}, 1fr)`
      : "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 10,
    alignItems: "stretch",
  };

  return (
    <section
      aria-labelledby="instagram-title"
      className={`seemati-instagram ${className}`}
      style={root}
    >
      <div style={inner}>
        <div style={headerRow}>
          <h3 id="instagram-title" style={title}>From our Instagram</h3>
          {showFollowBtn && (
            <a
              href={instaUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={followBtn}
              aria-label="Visit our Instagram profile"
            >
              Follow @seemati
            </a>
          )}
        </div>

        <div style={gridStyle} role="list" aria-label="Instagram posts">
          {posts.map((p) => (
            <a
              href={p.link || instaUrl}
              key={p.id}
              role="listitem"
              target="_blank"
              rel="noopener noreferrer"
              style={card}
            >
              <img
                src={p.img}
                alt={p.alt || "Seemati Instagram post"}
                style={imgStyle}
                onError={(e) => {
                  // remove broken images gracefully
                  e.currentTarget.parentElement.style.opacity = 0.6;
                }}
              />
            </a>
          ))}
        </div>

        <div style={{ marginTop: 10 }}>
          <small style={{ color: "#666" }}>
            Follow us on Instagram for daily outfits and customer photos.
          </small>
        </div>
      </div>
    </section>
  );
}

/* -------------------------
   Inline styles
   ------------------------- */

const root = {
  padding: "18px 12px",
  background: "#fff",
  color: "#111",
};

const inner = {
  maxWidth: 1100,
  margin: "0 auto",
};

const headerRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
};

const title = {
  fontSize: 18,
  margin: 0,
};

const followBtn = {
  padding: "8px 12px",
  background: "#0b6eff",
  color: "#fff",
  borderRadius: 8,
  textDecoration: "none",
  fontWeight: 600,
  fontSize: 14,
};

const card = {
  display: "block",
  width: "100%",
  height: 0,
  paddingBottom: "100%", // square aspect ratio
  overflow: "hidden",
  borderRadius: 8,
  position: "relative",
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  textDecoration: "none",
  background: "#f6f6f6",
};

const imgStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};
