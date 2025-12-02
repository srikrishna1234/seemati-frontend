// src/pages/BecomeDistributor.jsx
import React from "react";

export default function BecomeDistributor() {
  return (
    <div style={{ maxWidth: 900, margin: "36px auto", padding: 18 }}>
      {/* Headline + subheading */}
      <h1 style={{ marginBottom: 6 }}>Partner with Seemati — Become an Authorized Distributor</h1>
      <p style={{ marginTop: 0, color: "#444", fontSize: 16 }}>
        Join one of India’s fastest-growing women’s wear brands and build a profitable business.
      </p>

      {/* Why partner and requirements blocks */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 18 }}>
        <div style={{ background: "#fff", padding: 14, borderRadius: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.04)" }}>
          <h3 style={{ marginTop: 0 }}>Why Partner With Us</h3>
          <ul style={{ paddingLeft: 18 }}>
            <li>High-demand everyday products</li>
            <li>Excellent repeat customers</li>
            <li>Attractive margins</li>
            <li>High-quality manufacturing</li>
            <li>Strong brand identity</li>
          </ul>
        </div>

        <div style={{ background: "#fff", padding: 14, borderRadius: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.04)" }}>
          <h3 style={{ marginTop: 0 }}>Distributor Requirements</h3>
          <ul style={{ paddingLeft: 18 }}>
            <li>Basic investment</li>
            <li>Local market network</li>
            <li>Storage capacity</li>
          </ul>
        </div>
      </div>

      {/* Form intro */}
      <div style={{ marginTop: 20, color: "#333" }}>
        <p>
          Complete the short form below and our sales team will reach out to discuss terms, pricing, and next steps. Please provide
          accurate contact details so we can respond promptly.
        </p>
      </div>

      {/* Contact form */}
      <form style={{ marginTop: 18, display: "grid", gap: 12 }}>
        <input name="name" placeholder="Your full name" style={inputStyle} required />
        <input name="company" placeholder="Business / company name" style={inputStyle} required />
        <input name="phone" placeholder="Phone number" style={inputStyle} required />
        <input name="email" placeholder="Email address" style={inputStyle} required />
        <textarea name="message" placeholder="Tell us about your market / location" style={{ ...inputStyle, minHeight: 100 }} />
        <button type="submit" style={{ padding: "10px 14px", background: "#6b21a8", color: "#fff", borderRadius: 6, border: "none" }}>
          Submit enquiry
        </button>
      </form>
    </div>
  );
}

const inputStyle = {
  padding: "10px 12px",
  borderRadius: 6,
  border: "1px solid #ddd",
  fontSize: 14,
};
