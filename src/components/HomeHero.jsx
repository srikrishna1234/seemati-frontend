// src/components/HomeHero.jsx
import React, { useEffect, useState } from "react";

/**
 * Simple hero carousel. Props:
 * - images: array of image URLs (if empty, uses local fallback)
 */
export default function HomeHero({ images = [] }) {
  const fallback = [
    "/images/hero/hero-1.jpg",
    "/images/hero/hero-2.jpg",
    "/images/hero/hero-3.jpg"
  ];
  const list = (Array.isArray(images) && images.length > 0) ? images : fallback;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // autoplay every 5s
    const id = setInterval(() => setIndex(i => (i + 1) % list.length), 5000);
    return () => clearInterval(id);
  }, [list.length]);

  if (!list.length) return null;

  return (
    <div style={{
      margin: "8px 0 18px",
      borderRadius: 10,
      overflow: "hidden",
      position: "relative",
      boxShadow: "0 4px 18px rgba(0,0,0,0.08)"
    }}>
      <img
        src={list[index]}
        alt={`hero-${index}`}
        style={{ width: "100%", height: 320, objectFit: "cover", display: "block" }}
        onError={(e) => { e.currentTarget.src = "/images/hero/hero-1.jpg"; }}
      />

      {/* left / right buttons */}
      <button
        aria-label="previous"
        onClick={() => setIndex((index - 1 + list.length) % list.length)}
        style={{
          position: "absolute",
          left: 10,
          top: "50%",
          transform: "translateY(-50%)",
          background: "rgba(255,255,255,0.85)",
          border: "none",
          padding: "6px 8px",
          borderRadius: 6,
          cursor: "pointer"
        }}
      >&lt;</button>

      <button
        aria-label="next"
        onClick={() => setIndex((index + 1) % list.length)}
        style={{
          position: "absolute",
          right: 10,
          top: "50%",
          transform: "translateY(-50%)",
          background: "rgba(255,255,255,0.85)",
          border: "none",
          padding: "6px 8px",
          borderRadius: 6,
          cursor: "pointer"
        }}
      >&gt;</button>

      {/* small thumbnails under hero */}
      <div style={{
        display: "flex",
        gap: 10,
        padding: 10,
        justifyContent: "center",
        background: "#fff"
      }}>
        {list.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`thumb-${i}`}
            onClick={() => setIndex(i)}
            style={{
              width: 56,
              height: 56,
              objectFit: "cover",
              borderRadius: 6,
              boxShadow: i === index ? "0 6px 18px rgba(0,0,0,0.15)" : "none",
              cursor: "pointer"
            }}
            onError={(e) => { e.currentTarget.src = "/images/thumbs/placeholder.png"; }}
          />
        ))}
      </div>
    </div>
  );
}
