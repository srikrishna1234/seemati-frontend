// src/pages/OtpLogin.jsx
import React, { useState } from "react";
import axiosInstance from "../api/axiosInstance"; // shared axios instance

export default function OtpLogin() {
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState(""); // user-facing status
  const [error, setError] = useState("");

  async function sendOtp(e) {
    e?.preventDefault?.();
    setError("");
    setStatus("Sending OTP...");
    try {
      // <<< IMPORTANT: use '/auth/send-otp' (no leading '/api') because axiosInstance baseURL = '/api' in dev
      console.debug("[OtpLogin] calling", axiosInstance.defaults.baseURL + "/auth/send-otp");
      const resp = await axiosInstance.post("/auth/send-otp", { phone });
      console.debug("[OtpLogin] response", resp && resp.status, resp && resp.data);
      setStatus("OTP sent. Check your phone.");
    } catch (err) {
      console.error("[OtpLogin] send error", err);
      // Try to provide helpful error text
      const msg =
        err?.response?.data?.message ||
        err?.response?.data ||
        err?.message ||
        "Failed to send OTP";
      setError(`Failed to send OTP: ${msg}`);
      setStatus("");
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 12 }}>
        <a href="/">← Back to site</a>
      </div>

      <h1>Admin</h1>
      <div style={{ color: "#666", marginBottom: 12 }}>Manage products and site content</div>

      <div style={{ background: "yellow", padding: 12, marginBottom: 20, textAlign: "center", fontWeight: 700 }}>
        DEBUG: OTP_PAGE_LOADED
      </div>

      <h2>OTP Login</h2>
      <form onSubmit={sendOtp} style={{ maxWidth: 540 }}>
        <div style={{ marginBottom: 8 }}>
          <label>Phone</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="10-digit mobile (eg. 9042163246)"
            style={{ width: "100%", padding: "8px", marginTop: 6 }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button type="submit">Send OTP</button>
          <button type="button" onClick={() => { setPhone(""); setStatus(""); setError(""); }}>
            Reset
          </button>
        </div>

        {status && <div style={{ background: "#ecfdf5", color: "#065f46", padding: 10, marginBottom: 12 }}>Status: {status}</div>}
        {error && <div style={{ background: "#fee2e2", color: "#991b1b", padding: 10, marginBottom: 12 }}>Error: {error}</div>}

        <div style={{ color: "#666", marginTop: 8 }}>
          Note: For testing the server you may use an OTP bypass code (default 1234).
        </div>
      </form>

      <div style={{ marginTop: 20, color: "#777", fontSize: 13 }}>
        If you have issues logging in, check server logs or contact the developer.
      </div>
    </div>
  );
}
