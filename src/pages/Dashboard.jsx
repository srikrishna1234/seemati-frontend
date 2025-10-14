// src/pages/Dashboard.jsx
import React from "react";
import { useAuth } from "../auth/AuthProvider";

export default function Dashboard() {
  const { user, logout } = useAuth();
  return (
    <div style={{padding:20}}>
      <h2>Dashboard (Protected)</h2>
      <pre>{JSON.stringify(user, null, 2)}</pre>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
