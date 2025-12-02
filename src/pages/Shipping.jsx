// src/pages/Shipping.jsx
import React from "react";
import { Helmet } from "react-helmet";

export default function Shipping() {
  const container = {
    maxWidth: 980,
    margin: "36px auto",
    padding: "24px",
    fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
    lineHeight: 1.6,
    color: "#222",
  };

  const h1 = {
    fontSize: 28,
    marginBottom: 12,
    fontWeight: 700,
  };

  const card = {
    background: "#fff",
    borderRadius: 10,
    padding: 16,
    boxShadow: "0 6px 18px rgba(0,0,0,0.05)",
    border: "1px solid rgba(0,0,0,0.04)",
  };

  const smallNote = {
    fontSize: 13,
    color: "#555",
    marginTop: 8,
  };

  const list = {
    paddingLeft: 20,
    marginTop: 8,
  };

  return (
    <main style={container}>
      <Helmet>
        <title>Shipping & delivery — Seemati</title>
      </Helmet>

      <h1 style={h1}>Shipping & delivery</h1>

      <div style={card}>
        <p>
          Thank you for shopping with <strong>Seemati</strong>. This page explains how we handle order processing, shipping, tracking and delivery for purchases made on this website.
        </p>

        <h2 style={{ fontSize: 18, marginTop: 20, marginBottom: 8, fontWeight: 600 }}>Order processing</h2>
        <p>
          Orders are usually processed within <strong>1–2 business days</strong> after payment confirmation (excluding weekends and public holidays). During seasonal peaks or sale periods processing may take slightly longer — we will notify you if there is any delay.
        </p>

        <h2 style={{ fontSize: 18, marginTop: 20, marginBottom: 8, fontWeight: 600 }}>Shipping methods & delivery times</h2>
        <p>
          We use trusted courier partners to deliver across India. Typical delivery timeframes (from dispatch date) are:
        </p>

        <ul style={list}>
          <li><strong>Metro cities:</strong> 2–4 business days</li>
          <li><strong>Major towns:</strong> 3–7 business days</li>
          <li><strong>Remote areas:</strong> 5–10 business days</li>
        </ul>

        <p style={smallNote}>
          These are estimates only — actual delivery depends on courier availability, local holidays, and weather conditions.
        </p>

        <h2 style={{ fontSize: 18, marginTop: 20, marginBottom: 8, fontWeight: 600 }}>Shipping charges</h2>
        <p>
          Shipping charges are calculated at checkout and depend on the delivery location, order weight/size, and any active offers (e.g. free shipping above a minimum order value).
        </p>

        <h2 style={{ fontSize: 18, marginTop: 20, marginBottom: 8, fontWeight: 600 }}>Dispatch & tracking</h2>
        <p>
          Once your order is dispatched you will receive an email confirming dispatch, SMS notification (if mobile number provided) and a courier tracking number (clickable link where available).
        </p>

        <p style={{ marginTop: 16, fontSize: 13, color: "#666" }}>
          Last updated: December 1, 2025
        </p>
      </div>
    </main>
  );
}
