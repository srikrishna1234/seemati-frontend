// src/pages/OtpLogin.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosInstance";
import { useAuth } from "../auth/AuthProvider";

export default function OtpLogin() {
  const [phone, setPhone] = useState("9042XXXXXXX");
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState("");
  const navigate = useNavigate();
  const { saveTokenAndUser } = useAuth();

  async function sendOtp() {
    setStatus("Sending OTP...");
    try {
      const resp = await api.post("/api/otp/send", { phone });
      setStatus(resp.data?.message || "OTP sent");
    } catch (e) {
      setStatus(e?.response?.data?.message || e.message || "Send failed");
    }
  }

  async function verifyOtp() {
    setStatus("Verifying OTP...");
    try {
      const resp = await api.post("/api/otp/verify", { phone, otp });
      const token = resp.data?.token;
      if (token) {
        // some backends also send user object; if present, pass to saveTokenAndUser
        const user = resp.data?.user || null;
        saveTokenAndUser(token, user);
        setStatus("Verified — redirecting...");
        navigate("/dashboard");
      } else {
        // no token: still success but no JWT configured
        setStatus("Verified (no token returned)");
      }
    } catch (e) {
      setStatus(e?.response?.data?.message || e.message || "Verify failed");
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: "24px auto", padding: 12 }}>
      <h2>OTP Login</h2>
      <div>
        <label>Phone</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} style={{width:"100%",padding:8}}/>
        <button onClick={sendOtp} style={{marginTop:8}}>Send OTP</button>
      </div>

      <div style={{marginTop:16}}>
        <label>OTP</label>
        <input value={otp} onChange={(e) => setOtp(e.target.value)} style={{width:"100%",padding:8}}/>
        <button onClick={verifyOtp} style={{marginTop:8}}>Verify OTP</button>
      </div>

      <div style={{marginTop:16}}>
        <strong>Status:</strong> {status}
      </div>
    </div>
  );
}
