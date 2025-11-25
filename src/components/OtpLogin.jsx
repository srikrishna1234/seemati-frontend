// src/components/OtpLogin.jsx
import React, { useState } from "react";
import api from "../api/axiosInstance"; // <-- Use shared axios instance

export default function OtpLogin() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("");

  const sendOtp = async () => {
    try {
      setStatus("Sending OTP...");
      const resp = await api.post("/otp/send", { phone });  // <-- FIXED (no /api)
      if (resp.data.ok) {
        setStatus("OTP sent successfully!");
      } else {
        setStatus("Failed: " + (resp.data.message || "Unknown error"));
      }
    } catch (err) {
      console.error("OTP send error:", err);
      setStatus("Request failed: " + err.message);
    }
  };

  const verifyOtp = async () => {
    try {
      setStatus("Verifying...");
      const resp = await api.post("/otp/verify", { phone, code }); // <-- FIXED
      if (resp.data.ok) {
        setStatus("OTP Verified! You are logged in.");
        window.location.href = "/admin/products";
      } else {
        setStatus("Invalid OTP");
      }
    } catch (err) {
      console.error("Verify error:", err);
      setStatus("Request failed: " + err.message);
    }
  };

  return (
    <div style={{ padding: "30px" }}>
      <h2>OTP Login</h2>

      <label>Phone</label>
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        style={{ width: "300px", display: "block", marginBottom: "10px" }}
      />

      <button onClick={sendOtp}>Send OTP</button>

      <br /><br />

      <label>OTP</label>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        style={{ width: "300px", display: "block", marginBottom: "10px" }}
      />

      <button onClick={verifyOtp}>Verify OTP</button>

      <p><b>Status:</b> {status}</p>
    </div>
  );
}
