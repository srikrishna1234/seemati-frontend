// src/components/PrivateRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

/**
 * PrivateRoute protects admin routes.
 * - Calls /api/auth/me to check if user is authenticated.
 * - If not logged in, redirects to /admin/login.
 */
export default function PrivateRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include", // important: include cookies
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          setAuthed(true);
        } else {
          setAuthed(false);
        }
      } catch (e) {
        setAuthed(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!authed) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
