// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import jwtDecode from "jwt-decode";

function tokenValid() {
  const token = localStorage.getItem("token");
  if (!token) return false;
  try {
    const decoded = jwtDecode(token);
    // If token has exp, check it. If no exp claim, assume valid (legacy tokens).
    if (!decoded || typeof decoded !== 'object') return false;
    if (decoded.exp) {
      const now = Math.floor(Date.now() / 1000);
      return decoded.exp > now;
    }
    return true;
  } catch (e) {
    return false;
  }
}

export default function ProtectedRoute({ redirectTo = "/admin/login" }) {
  return tokenValid() ? <Outlet /> : <Navigate to={redirectTo} replace />;
}
