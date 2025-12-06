// src/admin/AdminLogin.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  async function handleSendOtp(e) {
    e.preventDefault();
    setError("");
    setStatus("");

    if (!phone || phone.length < 10) {
      setError("Please enter a valid phone number.");
      return;
    }

    try {
      setSending(true);
      setStatus("Sending OTP…");

      const resp = await axiosInstance.post("/api/auth/send-otp", {
        phone: phone.trim(),
      });

      if (resp.data?.ok) {
        setOtpSent(true);
        setStatus("OTP sent successfully.");
      } else {
        setError(resp.data?.message || "Failed to send OTP.");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSending(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError("");
    setStatus("");

    const otp = document.getElementById("otp-input")?.value || "";

    if (!phone || !otp) {
      setError("Phone and OTP are required.");
      return;
    }

    try {
      setVerifying(true);
      setStatus("Verifying OTP…");

      const resp = await axiosInstance.post("/api/auth/verify-otp", {
        phone: phone.trim(),
        otp: otp.trim(),
      });

      if (resp.data?.ok) {
        setStatus("Verified! Redirecting…");
        setTimeout(() => navigate("/admin/products"), 300);
      } else {
        setError(resp.data?.message || "Invalid OTP.");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 480, margin: "0 auto" }}>
      <h1>Admin Login</h1>
      <p>Enter your mobile number to receive an OTP.</p>

      {status && <div style={{ padding: 10, background: "#eaffea" }}>{status}</div>}
      {error && <div style={{ padding: 10, background: "#ffeaea" }}>{error}</div>}

      {!otpSent && (
        <form onSubmit={handleSendOtp}>
          <label>Phone Number</label>
          <input
            type="text"
            placeholder="Enter phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{ width: "100%", padding: 8, marginTop: 8 }}
          />
          <button type="submit" disabled={sending} style={{ marginTop: 10 }}>
            {sending ? "Sending…" : "Send OTP"}
          </button>
        </form>
      )}

      {otpSent && (
        <form onSubmit={handleVerifyOtp} style={{ marginTop: 20 }}>
          <label>Enter OTP</label>
          <input
            id="otp-input"
            type="text"
            placeholder="OTP"
            style={{ width: "100%", padding: 8, marginTop: 8 }}
          />
          <button type="submit" disabled={verifying} style={{ marginTop: 10 }}>
            {verifying ? "Verifying…" : "Verify OTP"}
          </button>
        </form>
      )}
    </div>
  );
}
