// src/pages/Contact.jsx
import React from "react";
import { Helmet } from "react-helmet";

export default function Contact() {
  const container = {
    padding: 28,
    maxWidth: 980,
    margin: "36px auto",
    fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
    color: "#222",
  };

  const card = {
    background: "#fff",
    padding: 16,
    borderRadius: 10,
    boxShadow: "0 6px 18px rgba(0,0,0,0.04)",
  };

  const infoRow = { marginBottom: 8 };

  return (
    <main style={container}>
      <Helmet><title>Contact — Seemati</title></Helmet>

      <h1 style={{ fontSize: 26, marginBottom: 12 }}>Contact us</h1>

      <div style={card}>
        <p>If you have questions about an order, shipping, or product details, reach out to us:</p>

        <div style={infoRow}><strong>Email:</strong> <a href="mailto:support@seemati.com">support@seemati.com</a></div>
        <div style={infoRow}><strong>Phone / WhatsApp:</strong> +91 9042163246</div>

        <h3 style={{ marginTop: 12 }}>Business hours</h3>
        <p style={{ marginTop: 4 }}>Mon–Sat, 10:00 — 18:00 IST. We aim to respond within 24–48 hours (excluding holidays).</p>

        <p style={{ marginTop: 12, fontSize: 13, color: "#666" }}>
          Include your order number and a short description of the issue to help us assist you quickly.
        </p>
      </div>
    </main>
  );
}
