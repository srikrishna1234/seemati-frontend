// src/home/HomeBanners.jsx
import React from "react";

/**
 * HomeBanners.jsx
 * - Small, horizontally-scrollable promo/banner strip for offers.
 * - Accessible, keyboard-focusable links.
 * - Accepts `banners` prop (array of {id, title, subtitle, href, color})
 *
 * Usage:
 * import HomeBanners from "../home/HomeBanners";
 * <HomeBanners />
 */

const DEFAULT_BANNERS = [
  { id: 1, title: "Flat 20% off — First order", subtitle: "Use WELCOME20 • On selected styles", href: "/shop?offer=welcome", color: "#6b21a8" },
  { id: 2, title: "Free exchange within 15 days", subtitle: "Size-friendly returns", href: "/policy#returns", color: "#0f766e" },
  { id: 3, title: "Limited time: Combo deals", subtitle: "Save more on sets", href: "/shop?tag=combo", color: "#b45309" },
];

export default function HomeBanners({ banners = DEFAULT_BANNERS }) {
  if (!Array.isArray(banners) || banners.length === 0) return null;

  return (
    <div
  aria-label="Promotional offers"
  style={{
    display: "flex",
    justifyContent: "center",   // ✅ CENTER ON DESKTOP
    gap: 16,
    margin: "18px auto",
    overflowX: "auto",          // ✅ KEEP SCROLL FOR MOBILE
    padding: "8px 6px",
    scrollSnapType: "x mandatory",
  }}
>

      {banners.map((b) => (
        <a
          key={b.id}
          href={b.href || "/shop"}
          style={{
            minWidth: 260,
            scrollSnapAlign: "start",
            background: b.color || "#6b21a8",
            color: "#fff",
            padding: 14,
            borderRadius: 10,
            textDecoration: "none",
            boxShadow: "0 8px 22px rgba(0,0,0,0.08)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-start",
            outline: "none",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.click();
          }}
        >
          <strong style={{ fontSize: 16, lineHeight: 1.1 }}>{b.title}</strong>
          {b.subtitle && <span style={{ marginTop: 6, fontSize: 13, opacity: 0.95 }}>{b.subtitle}</span>}
        </a>
      ))}
    </div>
  );
}
