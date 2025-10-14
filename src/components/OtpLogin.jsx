// src/components/OtpLogin.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosInstance";
import { useAuth } from "../auth/AuthProvider";

export default function OtpLogin() {
  const [phone, setPhone] = useState("9042XXXXXXX"); // default for dev; change as needed
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("enterPhone"); // enterPhone | waitOtp | verified
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [cooldown, setCooldown] = useState(0); // seconds until resend allowed
  const { saveTokenAndUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let t = null;
    if (cooldown > 0) {
      t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    }
    return () => clearTimeout(t);
  }, [cooldown]);

  // Helper to start cooldown (e.g., 30s)
  function startCooldown(sec = 30) {
    setCooldown(sec);
  }

  async function handleSendOtp(e) {
    e && e.preventDefault();
    setMessage(null);
    const normalizedPhone = String(phone).trim();
    if (!normalizedPhone) {
      setMessage({ type: "error", text: "Please enter a phone number." });
      return;
    }

    setLoading(true);
    try {
      const resp = await api.post("/api/otp/send", { phone: normalizedPhone });
      const data = resp.data;
      setLoading(false);
      if (data?.success) {
        setMessage({ type: "success", text: data.message || "OTP sent" });
        setStep("waitOtp");
        startCooldown(30);
      } else {
        setMessage({ type: "error", text: data?.message || "Failed to send OTP" });
      }
    } catch (err) {
      setLoading(false);
      const txt = err?.response?.data?.message || err.message || "Failed to send OTP";
      setMessage({ type: "error", text: txt });
    }
  }

  async function handleVerifyOtp(e) {
    e && e.preventDefault();
    setMessage(null);
    const normalizedPhone = String(phone).trim();
    if (!normalizedPhone || !otp) {
      setMessage({ type: "error", text: "Phone and OTP are required." });
      return;
    }

    setLoading(true);
    try {
      const resp = await api.post("/api/otp/verify", { phone: normalizedPhone, otp: String(otp) });
      const data = resp.data;
      setLoading(false);
      if (data?.success) {
        // If backend returns token, save and redirect
        if (data.token) {
          // some backends return user object too; pass it if present
          const userObj = data.user || null;
          saveTokenAndUser(data.token, userObj);
          setMessage({ type: "success", text: "Verified — redirecting..." });
          setStep("verified");
          // small delay so message shows
          setTimeout(() => navigate("/admin/products"), 350);
        } else {
          // Verified but no JWT configured — just redirect to products
          setMessage({ type: "success", text: "Verified (no token). Redirecting..." });
          setTimeout(() => navigate("/admin/products"), 300);
        }
      } else {
        setMessage({ type: "error", text: data?.message || "OTP verification failed" });
      }
    } catch (err) {
      setLoading(false);
      const txt = err?.response?.data?.message || err.message || "Verification failed";
      setMessage({ type: "error", text: txt });
    }
  }

  function handleResend(e) {
    e && e.preventDefault();
    if (cooldown > 0) return;
    handleSendOtp();
  }

  function renderMessage() {
    if (!message) return null;
    const color = message.type === "error" ? "#c62828" : "#2e7d32";
    return (
      <div style={{ marginTop: 8, padding: 10, borderRadius: 6, background: "#f7f7f7", color }}>
        {message.text}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 420, margin: "32px auto", padding: 18, border: "1px solid #eee", borderRadius: 8 }}>
      <h2 style={{ marginTop: 0 }}>Admin login (OTP)</h2>

      {step === "enterPhone" && (
        <form onSubmit={handleSendOtp}>
          <label style={{ display: "block", marginBottom: 6 }}>Phone (local, e.g. 9042XXXXXXX)</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="9042XXXXXXX"
            style={{ width: "100%", padding: 10, fontSize: 16, borderRadius: 6, border: "1px solid #ddd" }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              type="submit"
              disabled={loading}
              style={{ flex: 1, padding: "10px 12px", background: "#1976d2", color: "white", border: "none", borderRadius: 6 }}
            >
              {loading ? "Sending..." : "Send OTP"}
            </button>
            <button
              type="button"
              onClick={() => { setPhone(""); setOtp(""); setMessage(null); }}
              style={{ padding: "10px 12px", background: "#eee", border: "none", borderRadius: 6 }}
            >
              Clear
            </button>
          </div>
        </form>
      )}

      {step === "waitOtp" && (
        <form onSubmit={handleVerifyOtp}>
          <div style={{ marginBottom: 8 }}>
            <label>Phone</label>
            <div style={{ padding: 10, background: "#fafafa", borderRadius: 6, border: "1px solid #eee" }}>{phone}</div>
          </div>

          <div style={{ marginBottom: 8 }}>
            <label>Enter OTP</label>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
              style={{ width: "100%", padding: 10, fontSize: 16, borderRadius: 6, border: "1px solid #ddd" }}
            />
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              type="submit"
              disabled={loading}
              style={{ padding: "10px 12px", background: "#2e7d32", color: "white", border: "none", borderRadius: 6 }}
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || loading}
              style={{ padding: "10px 12px", background: cooldown > 0 ? "#f0f0f0" : "#1976d2", color: cooldown > 0 ? "#666" : "white", border: "none", borderRadius: 6 }}
            >
              {cooldown > 0 ? `Resend (${cooldown}s)` : "Resend OTP"}
            </button>

            <button
              type="button"
              onClick={() => { setStep("enterPhone"); setOtp(""); setMessage(null); }}
              style={{ padding: "10px 12px", background: "#eee", border: "none", borderRadius: 6 }}
            >
              Change number
            </button>
          </div>
        </form>
      )}

      {renderMessage()}

      <div style={{ marginTop: 12, fontSize: 13, color: "#666" }}>
        <div>Note: OTP is printed to server console in dev mode (if MSG91 not configured).</div>
        <div>If you have issues, check backend logs or use the debug curl commands.</div>
      </div>
    </div>
  );
}
