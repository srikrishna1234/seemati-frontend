// src/pages/Testimonials.jsx
import React from "react";

const Testimonials = () => {
  // Minimal placeholder; replace with your real content later
  const items = [
    { id: 1, name: "Anita", text: "Love the comfort and fit!" },
    { id: 2, name: "Sushma", text: "Great quality — fabric feels premium." },
    { id: 3, name: "Pooja", text: "Fast delivery and excellent service." },
  ];

  return (
    <div style={{ padding: "2.5rem 1rem", maxWidth: 1100, margin: "0 auto" }}>
      <h1>Customer Testimonials</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16, marginTop: 16 }}>
        {items.map(t => (
          <blockquote key={t.id} style={{ border: "1px solid #eee", padding: 16, borderRadius: 8, background: "#fff" }}>
            <p style={{ margin: "0 0 8px" }}>{t.text}</p>
            <footer style={{ fontSize: 13, color: "#555" }}>— {t.name}</footer>
          </blockquote>
        ))}
      </div>
    </div>
  );
};

export default Testimonials;
