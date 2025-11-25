// File: src/components/PrivateRoute.jsx
// Full replacement: uses shared axios instance (src/api/axiosInstance.js)

import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../api/axiosInstance";

/**
 * PrivateRoute protects admin routes.
 * - Calls /auth/me on the configured API (via axios instance) to check if user is authenticated.
 * - If not logged in, redirects to /admin/login.
 */
export default function PrivateRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get("/auth/me");
        const data = res?.data;
        if (!mounted) return;
        if (res.status === 200 && data && data.ok) {
          setAuthed(true);
        } else {
          setAuthed(false);
        }
      } catch (e) {
        if (!mounted) return;
        setAuthed(false);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!authed) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
