// src/AdminPanel.js
import React from "react";
import { Link } from "react-router-dom";

export default function AdminPanel() {
  return (
    <div style={{ padding: 20 }}>
      <h2>Admin Panel — Seemati Ladies Wear</h2>
      <p>This is a simple admin UI placeholder. Upload products & images from here later.</p>

      <div style={{ marginTop: 20 }}>
        <Link to="/">← Back to Shop</Link>
      </div>
    </div>
  );
}
