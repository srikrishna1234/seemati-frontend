// src/components/OtpLogin.jsx
import React, { useState, useRef, useEffect } from "react";
import api from "../api/axiosInstance";

/**
 * Debuggable OtpLogin — replacement for debugging why "sent" never becomes true.
 * - Shows raw server response / status in UI
 * - Adds "Force show OTP" button to reveal OTP input for UI testing
 * - Keeps single-page, no redirect behavior
 *
 * After you finish debugging, revert to the non-debug version (remove debug UI).
 */

export default function OtpLogin({ onLogin, defaultPhone = "" }) {
  const [phone, setPhone] = useState(defaultPhone || "");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [lastResp, setLastResp] = useState(null); // debug: parsed resp.data or error info
  const [lastStatusCode, setLastStatusCode] = useState(null); // debug: HTTP status
  const otpRef = useRef(null);
  const otpContainerRef = useRef(null);

  // resend timer
  const [resendTimer, setResendTimer] = useState(0);
  useEffect(() => {
    let t = null;
    if (resendTimer > 0) t = setTimeout(() => setResendTimer((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

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
  function revealOtpInput() {
    setTimeout(() => {
      try {
        if (otpContainerRef.current) otpContainerRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        if (otpRef.current) otpRef.current.focus();
      } catch (e) {
        console.warn("revealOtpInput failed:", e);
      }
    }, 150);
  }

  async function sendOtp() {
    setError("");
    setStatus("");
    setOtp("");
    setLastResp(null);
    setLastStatusCode(null);

    if (!validPhone(phone)) {
      setError("Enter a valid 10-digit phone number.");
      return;
    }

    setLoading(true);
    setStatus("Sending OTP…");

    try {
      const body = { phone: normalizePhone(phone) };
      const resp = await api.post("/api/auth/send-otp", body, { withCredentials: true });
      // Debug: capture status and data for UI
      setLastStatusCode(resp && resp.status ? resp.status : null);
      setLastResp(resp && resp.data ? resp.data : resp);

      console.info("[OTP DEBUG] send response:", resp && resp.data ? resp.data : resp);

      const data = resp && resp.data ? resp.data : {};

      // Be permissive in debug mode: accept common success shapes
      const ok =
        (data && (data.ok === true || data.success === true)) ||
        // some backends return { status: 'ok' } or { result: 'ok' }
        (data && (data.status === "ok" || data.result === "ok")) ||
        // or sometimes backend returns 200 and message only
        (resp && resp.status === 200 && typeof data === "object");

      if (ok) {
        setSent(true);
        setStatus(data.message || "OTP sent. Check your phone.");
        if (data.bypass || data.testCode) {
          const testCode = data.testCode || process.env.REACT_APP_OTP_TEST_CODE || "1234";
          setStatus((prev) => `${prev} (Test code: ${testCode})`);
        }
        setResendTimer(60);
        revealOtpInput();
      } else {
        const msg = data && (data.message || data.error) ? (data.message || data.error) : JSON.stringify(data);
        setError("Failed to send OTP: " + msg);
      }
    } catch (err) {
      console.error("[OTP DEBUG] sendOtp error:", err);
      const msg =
        err && err.response && err.response.data && (err.response.data.message || err.response.data.error)
          ? (err.response.data.message || err.response.data.error)
          : err.message || "Network error";
      setError("Failed to send OTP: " + msg);
      // capture error response body if present
      if (err && err.response) {
        setLastStatusCode(err.response.status || null);
        setLastResp(err.response.data || err.response);
      } else {
        setLastResp({ message: err.message || String(err) });
      }
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
      setLastStatusCode(resp && resp.status ? resp.status : null);
      setLastResp(resp && resp.data ? resp.data : resp);
      console.info("[OTP DEBUG] verify response:", resp && resp.data ? resp.data : resp);

      const data = resp && resp.data ? resp.data : {};

      if (data && (data.ok === true || data.success === true || data.status === "ok" || resp.status === 200)) {
        setStatus("Verified — processing login...");
        const token = data.token || data.accessToken || null;
        const user = data.user || null;
        if (typeof onLogin === "function") {
          await onLogin(user, token);
          setStatus("Logged in (parent handled navigation).");
        } else {
          if (token) {
            try {
              localStorage.setItem("authToken", token);
            } catch (e) {
              console.warn("Failed to store authToken:", e);
            }
          }
          if (user) {
            try {
              localStorage.setItem("authUser", JSON.stringify(user));
            } catch (e) {
              console.warn("Failed to store authUser:", e);
            }
          }
          setStatus((prev) => prev + (token ? " Token stored locally." : " No token returned."));
        }
      } else {
        const msg = data && (data.message || data.error) ? (data.message || data.error) : JSON.stringify(data);
        setError("Invalid OTP: " + msg);
        setSent(true);
      }
    } catch (err) {
      console.error("[OTP DEBUG] verifyOtp error:", err);
      const msg =
        err && err.response && err.response.data && (err.response.data.message || err.response.data.error)
          ? (err.response.data.message || err.response.data.error)
          : err.message || "Network error";
      setError("Verify failed: " + msg);
      if (err && err.response) {
        setLastStatusCode(err.response.status || null);
        setLastResp(err.response.data || err.response);
      } else {
        setLastResp({ message: err.message || String(err) });
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  // debug helper: force show OTP input (no server interaction)
  function forceShowOtp() {
    setSent(true);
    setStatus("Forced OTP input visible for UI testing.");
    setTimeout(() => {
      revealOtpInput();
    }, 150);
  }

  async function resendOtp() {
    if (resendTimer > 0) return;
    setOtp("");
    setError("");
    await sendOtp();
  }

  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      <h2 style={{ marginTop: 0 }}>OTP Login (DEBUG)</h2>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", marginBottom: 6 }}>Phone</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="10-digit mobile (eg. 9042163246)"
          style={{ width: "100%", padding: 8, boxSizing: "border-box" }}
          disabled={loading}
        />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={sendOtp} disabled={loading || resendTimer > 0}>
          {loading && !sent ? "Working…" : sent ? (resendTimer > 0 ? `Resend (${resendTimer}s)` : "Resend") : "Send OTP"}
        </button>

        <button
          type="button"
          onClick={() => {
            setPhone("");
            setOtp("");
            setSent(false);
            setError("");
            setStatus("");
            setResendTimer(0);
            setLastResp(null);
            setLastStatusCode(null);
          }}
          disabled={loading}
        >
          Reset
        </button>

        <button onClick={forceShowOtp} type="button" disabled={loading}>
          Force show OTP
        </button>
      </div>

      {sent && (
        <div ref={otpContainerRef}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 6 }}>Enter OTP</label>
            <input
              ref={otpRef}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="OTP code (4-6 digits)"
              style={{ width: "100%", padding: 8, boxSizing: "border-box" }}
              disabled={loading}
              maxLength={6}
              inputMode="numeric"
            />
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
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
            <button onClick={resendOtp} disabled={loading || resendTimer > 0}>
              {resendTimer > 0 ? `Wait ${resendTimer}s` : "Resend OTP"}
            </button>
          </div>
        </div>
      )}

      {status && (
        <div style={{ marginTop: 8, color: "#0a6", background: "#f2fff6", padding: 8, borderRadius: 4 }}>
          <strong>Status:</strong> {status}
        </div>
      )}
      {error && (
        <div style={{ marginTop: 8, color: "#900", background: "#fff6f6", padding: 8, borderRadius: 4 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* DEBUG: show last response and HTTP status */}
      <div style={{ marginTop: 12, fontSize: 13 }}>
        <div style={{ marginBottom: 6, color: "#333" }}>
          <strong>Debug — last HTTP status:</strong> {String(lastStatusCode ?? "-")}
        </div>
        <pre
          style={{
            background: "#f6f6f6",
            padding: 10,
            borderRadius: 6,
            maxHeight: 220,
            overflow: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}
        >
          {lastResp ? JSON.stringify(lastResp, null, 2) : "(no response captured yet)"}
        </pre>
      </div>

      <div style={{ marginTop: 12, fontSize: 13, color: "#666" }}>
        NOTE: This debug component is safe — no redirect. Use Network tab + the debug response above to find why `sent` never became true.
      </div>
    </div>
  );
}
