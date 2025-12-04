// src/components/OtpLogin.jsx
import React, { useState, useRef } from "react";
import api from "../api/axiosInstance";

export default function OtpLogin() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const otpRef = useRef(null);

  function normalizePhone(p) {
    if (!p) return "";
    const t = String(p).trim();
    const digits = t.replace(/\D/g, "");
    if (digits.length === 10) return digits;
    if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
    if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
    return digits;
  }

  function validPhone(p) {
    const n = normalizePhone(p);
    return /^[0-9]{10}$/.test(n);
  }

  async function sendOtp() {
    setError("");
    setStatus("");
    setOtp("");
    if (!validPhone(phone)) {
      setError("Enter a valid 10-digit phone number.");
      return;
    }
    setLoading(true);
    setStatus("Sending OTP…");
    try {
      const body = { phone: normalizePhone(phone) };
      const resp = await api.post("/api/auth/send-otp", body, { withCredentials: true });
      const data = resp && resp.data ? resp.data : {};
      if (data && data.ok) {
        setSent(true);
        setStatus(data.message || "OTP sent. Enter the code.");
        if (data.bypass) setStatus(prev => `${prev} (Test code: ${process.env.REACT_APP_OTP_TEST_CODE || "1234"})`);
        setTimeout(() => otpRef.current && otpRef.current.focus(), 200);
      } else {
        setError("Failed to send OTP: " + (data && data.message ? data.message : "Unknown error"));
      }
    } catch (err) {
      const msg = err.response && err.response.data && err.response.data.message ? err.response.data.message : err.message || "Network error";
      setError("Failed to send OTP: " + msg);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setError("");
    setStatus("");
    if (!validPhone(phone)) {
      setError("Enter a valid phone number first.");
      return;
    }
    if (!otp || !/^\d{4,6}$/.test(String(otp).trim())) {
      setError("Enter the OTP code (4-6 digits).");
      return;
    }
    setLoading(true);
    setStatus("Verifying…");
    try {
      const body = { phone: normalizePhone(phone), otp: String(otp).trim() };
      const resp = await api.post("/api/auth/verify-otp", body, { withCredentials: true });
      const data = resp && resp.data ? resp.data : {};
      if (data && data.ok) {
        setStatus("Verified — redirecting to admin...");
        window.location.href = "/admin/products";
      } else {
        setError("Invalid OTP: " + (data && data.message ? data.message : "Please try again"));
      }
    } catch (err) {
      const msg = err.response && err.response.data && err.response.data.message ? err.response.data.message : err.message || "Network error";
      setError("Verify failed: " + msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 420 }}>
      <h2 style={{ marginTop: 0 }}>Admin login</h2>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", marginBottom: 6 }}>Mobile number</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="10-digit mobile (eg. 9042163246)"
          style={{ width: "100%", padding: 8, boxSizing: "border-box" }}
          disabled={loading}
        />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={sendOtp} disabled={loading}>{loading ? "Working…" : "Send OTP"}</button>
        <button type="button" onClick={() => { setPhone(""); setOtp(""); setSent(false); setError(""); setStatus(""); }} disabled={loading}>Reset</button>
      </div>

      {sent && (
        <>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 6 }}>Enter OTP</label>
            <input
              ref={otpRef}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="OTP code (6 digits)"
              style={{ width: "100%", padding: 8, boxSizing: "border-box" }}
              disabled={loading}
              maxLength={6}
            />
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button onClick={verifyOtp} disabled={loading}>{loading ? "Working…" : "Verify OTP"}</button>
            <button onClick={() => { setSent(false); setOtp(""); setStatus(""); setError(""); }} disabled={loading}>Change number</button>
          </div>
        </>
      )}

      {status && <div style={{ marginTop: 8, color: "#0a6", background: "#f2fff6", padding: 8, borderRadius: 4 }}><strong>Status:</strong> {status}</div>}
      {error && <div style={{ marginTop: 8, color: "#900", background: "#fff6f6", padding: 8, borderRadius: 4 }}><strong>Error:</strong> {error}</div>}

      <div style={{ marginTop: 12, fontSize: 13, color: "#666" }}>
        Note: OTP is 6 digits by default (MSG91). For local testing, server may use an OTP bypass code (default <code>1234</code>).
      </div>
    </div>
  );
}
