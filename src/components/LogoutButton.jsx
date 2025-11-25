// File: src/components/LogoutButton.jsx
// Full replacement: use axios instance for logout

import React from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosInstance";

export default function LogoutButton() {
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await api.post("/auth/logout");
    } catch (e) {
      console.error("Logout failed:", e);
    }
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
