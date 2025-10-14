// src/components/WishlistIcon.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

function readCount() {
  try {
    const raw = localStorage.getItem("wishlist") || "[]";
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.length : 0;
  } catch (e) {
    return 0;
  }
}

export default function WishlistIcon({ to = "/wishlist", size = 20 }) {
  const [count, setCount] = useState(readCount());

  useEffect(() => {
    function onStorage(e) {
      if (!e.key || e.key === "wishlist" || e.key === "wishlist-refresh-ts") {
        setCount(readCount());
      }
    }
    window.addEventListener("storage", onStorage);
    const interval = setInterval(() => setCount(readCount()), 1000 * 6); // fallback poll
    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(interval);
    };
  }, []);

  return (
    <Link to={to} title="Saved items" style={{ position: "relative", display: "inline-flex", alignItems: "center", padding: 6, borderRadius: 6, textDecoration: "none", color: "inherit" }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"></path>
      </svg>

      {count > 0 && (
        <span style={{
          position: "absolute",
          right: 2,
          top: 2,
          minWidth: 18,
          height: 18,
          padding: "0 6px",
          borderRadius: 99,
          background: "#f97316",
          color: "#fff",
          fontSize: 12,
          fontWeight: 700,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 6px rgba(0,0,0,0.15)"
        }}>
          {count}
        </span>
      )}
    </Link>
  );
}
