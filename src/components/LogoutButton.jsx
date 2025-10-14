// src/components/LogoutButton.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

export default function LogoutButton() {
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include", // include cookie
      });
    } catch (e) {
      console.error("Logout failed:", e);
    }
    // Redirect to login page
    navigate("/admin/login", { replace: true });
  }

  return (
    <button
      onClick={handleLogout}
      style={{
        padding: "6px 12px",
        background: "#e63946",
        color: "#fff",
        border: "none",
        borderRadius: 4,
        cursor: "pointer",
      }}
    >
      Logout
    </button>
  );
}
