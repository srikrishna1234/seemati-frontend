// src/admin/AdminLogin.jsx
import React, { useState } from "react";

/**
 * Admin login (OTP)
 *
 * This component will attempt multiple candidate endpoints until one
 * responds successfully. That avoids deployment mismatches where the
 * backend mounted OTP at /api/otp or /api/auth or /otpRoutes etc.
 *
 * Replace the file directly, restart the frontend process and hard-refresh.
 */

const BACKEND_BASE =
  process.env.REACT_APP_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE ||
  // fallback to the live backend you were using
  "https://seemati-backend.onrender.com";

export default function AdminLogin() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState("enter"); // 'enter' | 'verify'
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [debug, setDebug] = useState(""); // small debug info for the page

  // Candidate endpoints (order matters: try common one first)
  const endpointCandidates = [
    `${BACKEND_BASE}/api/auth/send-otp`,
    `${BACKEND_BASE}/api/otp/send`,
    `${BACKEND_BASE}/api/otpRoutes/send`,
    `${BACKEND_BASE}/api/otp/send`,          // duplicate safe
    `${BACKEND_BASE}/auth/send-otp`,         // without /api
    `${BACKEND_BASE}/otp/send`,
    `${BACKEND_BASE}/otpRoutes/send`,
  ];

  // same list for verify (matching the send pattern)
  const verifyCandidates = [
    `${BACKEND_BASE}/api/auth/verify-otp`,
    `${BACKEND_BASE}/api/otp/verify`,
    `${BACKEND_BASE}/api/otpRoutes/verify`,
    `${BACKEND_BASE}/auth/verify-otp`,
    `${BACKEND_BASE}/otp/verify`,
    `${BACKEND_BASE}/otpRoutes/verify`,
  ];

  function normalizePhoneInput(p) {
    if (!p) return "";
    const digits = String(p).replace(/\D/g, "");
    // prefer 10-digit (strip leading 91 or 0)
    if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
    if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
    return digits;
  }

  async function tryPostUntilSuccess(urls, body) {
    // Try each URL until one returns a JSON body with ok:true or an HTTP OK (200) with JSON
    for (const u of urls) {
      try {
        console.debug("[AdminLogin] trying", u, body);
        setDebug(`Trying ${u}`);
        const res = await fetch(u, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          credentials: "include",
        });
        // If server returned non-JSON, handle gracefully:
        const text = await res.text();
        let json;
        try {
          json = text ? JSON.parse(text) : {};
        } catch (e) {
          json = { ok: false, error: "bad_json", raw: text };
        }

        console.debug("[AdminLogin] response from", u, res.status, json);
        // Accept success if HTTP 200/201 and json.ok is true OR HTTP 200 and json is present
        if ((res.status >= 200 && res.status < 300) && (json.ok === true || Object.keys(json).length > 0)) {
          return { url: u, res, json };
        } else {
          // continue trying on 404/500 or json.ok false
          continue;
        }
      } catch (err) {
        console.warn("[AdminLogin] network error for", u, err && err.message ? err.message : err);
        continue;
      }
    }
    return null;
  }

  async function sendOtp() {
    setMessage("");
    setDebug("");
    const normalized = normalizePhoneInput(phone);
    if (!/^\d{10}$/.test(normalized)) {
      setMessage("Enter a valid 10-digit phone number (digits only).");
      return;
    }
    setLoading(true);
    try {
      const body = { phone: normalized }; // backend expects phone (or mobile) — many routes accept phone
      const result = await tryPostUntilSuccess(endpointCandidates, body);

      if (!result) {
        setMessage("Failed to send OTP — no candidate endpoint responded (404/500). See console for details.");
        setDebug("Tried endpoints: " + endpointCandidates.join(", "));
        return;
      }

      // success (or at least server returned JSON)
      console.info("[AdminLogin] OTP send succeeded at", result.url, result.json);
      setMessage(result.json && (result.json.message || result.json.error || "OTP sent.") );
      setStage("verify");
      setDebug(`Used ${result.url}`);
    } catch (err) {
      console.error("[AdminLogin] sendOtp error:", err);
      setMessage("Network error sending OTP");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setMessage("");
    setDebug("");
    const normalized = normalizePhoneInput(phone);
    if (!/^\d{10}$/.test(normalized)) {
      setMessage("Enter a valid phone first.");
      return;
    }
    if (!otp || !/^\d{3,6}$/.test(String(otp).trim())) {
      setMessage("Enter the OTP code.");
      return;
    }
    setLoading(true);
    try {
      const body = { phone: normalized, otp: String(otp).trim() };
      const result = await tryPostUntilSuccess(verifyCandidates, body);
      if (!result) {
        setMessage("OTP verification failed — no endpoint accepted the request.");
        setDebug("Tried verify endpoints: " + verifyCandidates.join(", "));
        return;
      }
      console.info("[AdminLogin] verify succeeded at", result.url, result.json);
      if (result.json && result.json.ok) {
        setMessage("Logged in — redirecting to admin...");
        setDebug(`Used ${result.url}`);
        // give a short delay so user sees "Logged in" then redirect
        setTimeout(() => (window.location.href = "/admin/products"), 400);
      } else {
        setMessage(result.json && (result.json.message || result.json.error) ? (result.json.message || result.json.error) : "OTP verification failed");
      }
    } catch (err) {
      console.error("[AdminLogin] verifyOtp error:", err);
      setMessage("Network error verifying OTP");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1>Admin Login</h1>

      {message && <div style={{ color: "red", marginBottom: 12 }}>{message}</div>}

      {stage === "enter" && (
        <>
          <label>Phone Number</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="10-digit phone (eg. 9042163246)"
            style={{ width: "100%", padding: 8, marginTop: 6 }}
            disabled={loading}
          />
          <div style={{ marginTop: 10 }}>
            <button onClick={sendOtp} disabled={loading}>
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </div>
        </>
      )}

      {stage === "verify" && (
        <>
          <label>OTP</label>
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Enter the OTP"
            style={{ width: "100%", padding: 8, marginTop: 6 }}
            disabled={loading}
          />
          <div style={{ marginTop: 10 }}>
            <button onClick={verifyOtp} disabled={loading}>
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
            <button onClick={() => { setStage("enter"); setMessage(""); setOtp(""); }} style={{ marginLeft: 10 }}>
              Change number
            </button>
          </div>
        </>
      )}

      <div style={{ marginTop: 14, color: "#666", fontSize: 13 }}>
        Debug: {debug || "none"} <br />
        Backend base: {BACKEND_BASE}
      </div>
    </div>
  );
}
