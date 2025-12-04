// src/pages/OtpLogin.jsx
import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosInstance";
import { useAuth } from "../auth/AuthProvider";

/**
 * Page OtpLogin
 * - Uses backend endpoints:
 *    POST /api/auth/send-otp   { phone }
 *    POST /api/auth/verify-otp { phone, otp }
 * - Server sets auth cookie on verify; frontend may optionally save user via saveTokenAndUser.
 * - Redirects to /admin/products on successful login.
 *
 * NOTE: This file contains a debug banner "DEBUG: OTP_PAGE_LOADED" to confirm the component
 * is present in the deployed bundle. Remove that banner after debugging.
 */

export default function OtpLogin() {
  const [phone, setPhone] = useState(""); // empty by default
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const otpRef = useRef(null);
  const navigate = useNavigate();
  const { saveTokenAndUser } = useAuth() || {};

  // Normalize phone to 10-digit (without +91). Returns digits only.
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
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);
    setStatus("Sending OTP...");
    try {
      const body = { phone: normalizePhone(phone) };
      const resp = await api.post("/api/auth/send-otp", body, { withCredentials: true });
      const data = resp && resp.data ? resp.data : {};
      if (data && data.ok) {
        setSent(true);
        // show server message (may include bypass info)
        setStatus(data.message || "OTP sent. Enter the code to verify.");
        // focus otp input shortly
        setTimeout(() => otpRef.current && otpRef.current.focus(), 200);
      } else {
        setError("Failed to send OTP: " + (data && data.message ? data.message : "Unknown error"));
      }
    } catch (err) {
      console.error("sendOtp error:", err);
      const msg = err?.response?.data?.message || err.message || "Network error";
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
    if (!otp || !/^\d+$/.test(String(otp).trim())) {
      setError("Enter the OTP code.");
      return;
    }

    setLoading(true);
    setStatus("Verifying...");
    try {
      const body = { phone: normalizePhone(phone), otp: String(otp).trim() };
      const resp = await api.post("/api/auth/verify-otp", body, { withCredentials: true });
      const data = resp && resp.data ? resp.data : {};
      if (data && data.ok) {
        setStatus("Verified — redirecting to admin...");
        // If server returned user object, preserve it via saveTokenAndUser if available.
        if (data.user && typeof saveTokenAndUser === "function") {
          try {
            saveTokenAndUser(null, data.user); // token not returned because server sets cookie
          } catch (e) {
            console.warn("saveTokenAndUser failed:", e);
          }
        }
        // redirect to admin products (use admin route)
        window.location.href = "/admin/products";
      } else {
        setError("Verify failed: " + (data && data.message ? data.message : "Invalid OTP"));
      }
    } catch (err) {
      console.error("verifyOtp error:", err);
      const msg = err?.response?.data?.message || err.message || "Network error";
      setError("Verify failed: " + msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: "24px auto", padding: 12 }}>
      {/* DEBUG BANNER — visible indicator that this page component is loaded in runtime */}
      <div
        style={{
          background: "yellow",
          color: "#000",
          padding: 10,
          fontWeight: 700,
          textAlign: "center",
          marginBottom: 12,
        }}
      >
        DEBUG: OTP_PAGE_LOADED
      </div>

      <h2 style={{ marginTop: 0 }}>OTP Login</h2>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", marginBottom: 6 }}>Phone</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="10-digit mobile (eg. 9042163246)"
          style={{ width: "100%", padding: 8, boxSizing: "border-box" }}
          disabled={loading}
        />
        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
          <button onClick={sendOtp} disabled={loading}>
            {loading ? "Working…" : "Send OTP"}
          </button>
          <button
            type="button"
            onClick={() => {
              setPhone("");
              setOtp("");
              setSent(false);
              setStatus("");
              setError("");
            }}
            disabled={loading}
          >
            Reset
          </button>
        </div>
      </div>

      {sent && (
        <div style={{ marginTop: 14 }}>
          <label style={{ display: "block", marginBottom: 6 }}>OTP</label>
          <input
            ref={otpRef}
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Enter OTP"
            style={{ width: "100%", padding: 8, boxSizing: "border-box" }}
            disabled={loading}
          />
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <button onClick={verifyOtp} disabled={loading}>
              {loading ? "Working…" : "Verify OTP"}
            </button>
            <button
              onClick={() => {
                setSent(false);
                setOtp("");
                setStatus("");
                setError("");
              }}
              disabled={loading}
            >
              Change number
            </button>
          </div>
        </div>
      )}

      {!!status && (
        <div style={{ marginTop: 12, color: "#0a6", background: "#f2fff6", padding: 8, borderRadius: 4 }}>
          <strong>Status:</strong> {status}
        </div>
      )}

      {!!error && (
        <div style={{ marginTop: 12, color: "#900", background: "#fff6f6", padding: 8, borderRadius: 4 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 13, color: "#666" }}>
        Note: For testing the server may use an OTP bypass code (default <code>1234</code>).
      </div>
    </div>
  );
}
