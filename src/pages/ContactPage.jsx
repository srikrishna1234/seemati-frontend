// src/pages/ContactPage.jsx
import React, { useState } from "react";

const ContactPage = () => {
  const [state, setState] = useState({ name: "", email: "", message: "" });

  const handleChange = e => setState(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleSubmit = e => {
    e.preventDefault();
    // For now just log; integrate API later
    console.log("Contact form submitted:", state);
    alert("Thanks! Message logged to console (no backend hooked yet).");
    setState({ name: "", email: "", message: "" });
  };

  return (
    <div style={{ padding: "2.5rem 1rem", maxWidth: 700, margin: "0 auto" }}>
      <h1>Contact Us</h1>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, marginTop: 12 }}>
        <input name="name" value={state.name} onChange={handleChange} placeholder="Your name" required style={{ padding: 10 }} />
        <input name="email" type="email" value={state.email} onChange={handleChange} placeholder="Email" required style={{ padding: 10 }} />
        <textarea name="message" value={state.message} onChange={handleChange} placeholder="Message" rows={6} style={{ padding: 10 }} />
        <button type="submit" className="btn btn-primary">Send message</button>
      </form>
      <div style={{ marginTop: 20 }}>
        <p><strong>Phone:</strong> +91-9042163246</p>
        <p><strong>Email:</strong> support@seemati.in</p>
      </div>
    </div>
  );
};

export default ContactPage;
