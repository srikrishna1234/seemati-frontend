import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

export default function RequireAuth({ children }) {
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setAllowed(false);
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const now = Date.now() / 1000;
      if (payload.exp < now) {
        console.warn("Token expired at", new Date(payload.exp * 1000));
        setAllowed(false);
        return;
      }
      setAllowed(true);
    } catch (err) {
      console.error("Invalid token:", err);
      setAllowed(false);
    }
  }, []);

  if (allowed === null) {
    return <div style={{ padding: 20 }}>Checking authentication…</div>;
  }

  if (allowed === false) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
