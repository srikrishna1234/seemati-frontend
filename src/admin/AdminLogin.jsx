// src/admin/AdminLogin.jsx
import React, { useState } from "react";

const BACKEND =
  process.env.REACT_APP_API_BASE ||
  "https://seemati-backend.onrender.com";

export default function AdminLogin() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState("enter");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const normalize = (p) => p.replace(/\D/g, "").slice(-10);

  async function sendOtp() {
    const mobile = normalize(phone);
    setMsg("");

    if (!/^\d{10}$/.test(mobile)) {
      setMsg("Enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: mobile }),
      });

      const json = await res.json().catch(() => ({}));

      // FIX → backend returns json.ok, not json.success
      if (res.ok && json.ok) {
        setStage("verify");
        setMsg("OTP sent to your mobile.");
      } else {
        setMsg(json.message || json.error || "Failed to send OTP.");
      }
    } catch (err) {
      setMsg("Network error sending OTP");
    }
    setLoading(false);
  }

  async function verifyOtp() {
    const mobile = normalize(phone);
    setMsg("");

    if (!/^\d{10}$/.test(mobile)) {
      setMsg("Enter phone number again.");
      return;
    }
    if (!otp) {
      setMsg("Enter OTP.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: mobile, otp }),
      });

      const json = await res.json().catch(() => ({}));

      // FIX → backend returns json.ok
      if (res.ok && json.ok) {
        setMsg("Login successful… redirecting");
        setTimeout(() => {
          window.location.href = "/admin/products";
        }, 500);
      } else {
        setMsg(json.message || json.error || "OTP verification failed.");
      }
    } catch (err) {
      setMsg("Network error verifying OTP");
    }

    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 500, margin: "0 auto", padding: 24 }}>
      <h1>Admin Login</h1>

      {msg && <p style={{ color: "red" }}>{msg}</p>}

      {stage === "enter" && (
        <>
          <label>Phone Number</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="10-digit mobile"
            style={{ width: "100%", padding: 8, marginTop: 6 }}
          />
          <button onClick={sendOtp} disabled={loading} style={{ marginTop: 10 }}>
            {loading ? "Sending…" : "Send OTP"}
          </button>
        </>
      )}

      {stage === "verify" && (
        <>
          <label>Enter OTP</label>
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="OTP"
            style={{ width: "100%", padding: 8, marginTop: 6 }}
          />
          <button
            onClick={verifyOtp}
            disabled={loading}
            style={{ marginTop: 10 }}
          >
            {loading ? "Verifying…" : "Verify OTP"}
          </button>

          <button
            onClick={() => {
              setStage("enter");
              setOtp("");
              setMsg("");
            }}
            style={{ marginLeft: 10 }}
          >
            Change Number
          </button>
        </>
      )}
    </div>
  );
}
