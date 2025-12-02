// src/home/WhySeemati.jsx
import React from "react";

/**
 * WhySeemati.jsx
 * - Simple 3/4 feature cards explaining Seemati's value props.
 * - Use icons (emoji) as placeholders — replace with SVG icons if preferred.
 *
 * Usage:
 * import WhySeemati from "../home/WhySeemati";
 * <WhySeemati />
 */

const FEATURES = [
  {
    id: "fit",
    title: "Comfort-first fit",
    desc: "Thoughtful cuts that move with you — for everyday comfort without compromising style.",
    icon: "👖",
  },
  {
    id: "fabric",
    title: "Quality fabrics",
    desc: "Durable, colorfast fabrics chosen for long life and soft hand-feel.",
    icon: "🧵",
  },
  {
    id: "returns",
    title: "Easy returns",
    desc: "Hassle-free 15-day returns and quick exchanges so you can shop with confidence.",
    icon: "🔁",
  },
  {
    id: "trusted",
    title: "Trusted maker",
    desc: "Produced by Sri Krishna Apparells — decades of garment expertise and manufacturing quality.",
    icon: "🏷️",
  },
];

export default function WhySeemati({ features = FEATURES }) {
  return (
    <section aria-labelledby="why-seemati-heading" style={{ margin: "28px 0" }}>
      <h3 id="why-seemati-heading" style={{ textAlign: "center", margin: 0, fontSize: 22 }}>
        Why choose Seemati
      </h3>

      <p style={{ textAlign: "center", color: "#666", marginTop: 8, marginBottom: 16 }}>
        Thoughtful design, honest materials, and service that respects your time.
      </p>

      <div
        role="list"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginTop: 12,
        }}
      >
        {features.map((f) => (
          <article
            key={f.id}
            role="listitem"
            style={{
              background: "#fff",
              padding: 16,
              borderRadius: 10,
              boxShadow: "0 8px 24px rgba(9,10,10,0.04)",
              minHeight: 120,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
              alignItems: "flex-start",
            }}
            aria-label={f.title}
          >
            <div style={{ fontSize: 28, lineHeight: 1 }}>{f.icon}</div>
            <div style={{ fontWeight: 700, marginTop: 10 }}>{f.title}</div>
            <div style={{ color: "#666", marginTop: 8, fontSize: 14 }}>{f.desc}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
