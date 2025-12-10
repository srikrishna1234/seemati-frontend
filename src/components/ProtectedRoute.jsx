// src/components/ProtectedRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import jwtDecode from "jwt-decode";
import axios from "../api/axiosInstance";

function tokenValidLocal() {
  const token = localStorage.getItem("token");
  if (!token) return false;
  try {
    const decoded = jwtDecode(token);
    if (!decoded || typeof decoded !== "object") return false;
    if (decoded.exp) {
      const now = Math.floor(Date.now() / 1000);
      return decoded.exp > now;
    }
    // If token has no exp, treat it as invalid (safer)
    return false;
  } catch (e) {
    return false;
  }
}

export default function ProtectedRoute({ redirectTo = "/admin/login" }) {
  const [ok, setOk] = useState(null); // null = checking, true/false = final

  useEffect(() => {
    let mounted = true;

    // fast local check first
    if (!tokenValidLocal()) {
      if (mounted) setOk(false);
      return;
    }

    // if local ok, still verify with server
    (async () => {
      try {
        // adjust endpoint if your API uses another path
        const resp = await axios.get("/auth/me", { withCredentials: true });
        if (mounted) {
          // accept either { ok: true } or 200 response
          const valid = resp && (resp.status === 200) && (resp.data && (resp.data.ok !== false));
          setOk(!!valid);
        }
      } catch (err) {
        if (mounted) setOk(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  // still determining -> show nothing or a spinner
  if (ok === null) return null;

  return ok ? <Outlet /> : <Navigate to={redirectTo} replace />;
}
