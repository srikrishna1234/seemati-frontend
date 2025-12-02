// src/pages/NotFound.jsx
import React from "react";
import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div style={{ padding: "4rem 1rem", textAlign: "center" }}>
      <h1 style={{ fontSize: 48, margin: 0 }}>404</h1>
      <p style={{ marginTop: 12 }}>Page not found.</p>
      <Link to="/" className="btn btn-outline" style={{ marginTop: 12 }}>Back to home</Link>
    </div>
  );
};

export default NotFound;
