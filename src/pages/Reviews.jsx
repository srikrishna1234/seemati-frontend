// src/pages/Reviews.jsx
import React from "react";
import { Helmet } from "react-helmet";

const sampleReviews = [
  { name: "Ananya", rating: 5, text: "Lovely fit and fabric. Highly recommended!" },
  { name: "Priya", rating: 5, text: "The kurti pants are so comfortable — perfect for work." },
  { name: "Rina", rating: 4, text: "Good quality and quick delivery." },
];

export default function Reviews() {
  return (
    <main style={{ maxWidth: 1000, margin: "28px auto", padding: "0 20px" }}>
      <Helmet><title>Reviews — Seemati</title></Helmet>

      <h1 style={{ fontSize: 26 }}>Customer reviews</h1>

      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        {sampleReviews.map((r, i) => (
          <div key={i} style={{ background: "#fff", padding: 16, borderRadius: 10, boxShadow: "0 6px 18px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>{r.name}</strong>
              <div style={{ color: "#f59e0b" }}>{Array.from({ length: r.rating }).map((_,i)=> "★").join("")}</div>
            </div>
            <div style={{ marginTop: 8 }}>{r.text}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
